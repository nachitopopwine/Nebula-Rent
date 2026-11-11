/**
 * Reglas de clima espacial de Nébula Rent.
 * Usa las llamaradas solares (solar flares) reportadas por NASA DONKI
 * para estimar el riesgo de radiación de una ruta.
 */

export type NivelRiesgo = "BAJO" | "MODERADO" | "ALTO" | "EXTREMO";

export interface Llamarada {
  id: string;
  clase: string; // p. ej. "M1.2", "X2.0"
  inicio: string; // ISO
  pico: string | null;
  region: string | null;
}

export interface Destino {
  nombre: string;
  /** Multiplicador de exposición a radiación durante el viaje. */
  exposicion: number;
  diasViaje: number;
}

export const DESTINOS: readonly Destino[] = [
  { nombre: "Luna", exposicion: 0.6, diasViaje: 1 },
  { nombre: "Marte", exposicion: 1.0, diasViaje: 7 },
  { nombre: "Cinturón de Asteroides", exposicion: 1.1, diasViaje: 12 },
  { nombre: "Europa", exposicion: 1.4, diasViaje: 18 },
  { nombre: "Titán", exposicion: 1.2, diasViaje: 25 },
  { nombre: "Encélado", exposicion: 1.3, diasViaje: 26 },
];

/** Peso de una llamarada según su clase GOES (A < B < C < M < X, cada letra ×10). */
export function pesoLlamarada(clase: string): number {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)?$/i.exec(clase.trim());
  if (!m) return 0;
  const base: Record<string, number> = { A: 0.001, B: 0.01, C: 0.1, M: 1, X: 10 };
  const magnitud = m[2] ? Number(m[2]) : 1;
  return base[m[1].toUpperCase()] * magnitud;
}

/** La llamarada más intensa del período, o null si no hubo. */
export function mayorClase(llamaradas: Llamarada[]): string | null {
  let mayor: Llamarada | null = null;
  for (const l of llamaradas) {
    if (!mayor || pesoLlamarada(l.clase) > pesoLlamarada(mayor.clase)) mayor = l;
  }
  return mayor?.clase ?? null;
}

export function puntajeSolar(llamaradas: Llamarada[]): number {
  return llamaradas.reduce((total, l) => total + pesoLlamarada(l.clase), 0);
}

export function nivelPorPuntaje(puntaje: number): NivelRiesgo {
  if (puntaje < 2) return "BAJO";
  if (puntaje < 10) return "MODERADO";
  if (puntaje < 30) return "ALTO";
  return "EXTREMO";
}

const RECOMENDACIONES: Record<NivelRiesgo, string> = {
  BAJO: "Ventana despejada. Despegue autorizado sin restricciones.",
  MODERADO: "Despegue autorizado. Mantener escudos de radiación activos.",
  ALTO: "Se recomienda posponer el viaje o usar naves clase LUJO con blindaje reforzado.",
  EXTREMO: "Tormenta solar severa. Vuelos suspendidos hasta nuevo aviso.",
};

export interface EvaluacionRuta {
  destino: string;
  diasViaje: number;
  puntaje: number;
  riesgo: NivelRiesgo;
  recomendacion: string;
  autorizado: boolean;
}

export function buscarDestino(nombre: string): Destino | undefined {
  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return DESTINOS.find((d) => normalizar(d.nombre) === normalizar(nombre));
}

/** Evalúa una ruta. Destinos desconocidos usan exposición 1.0 y 10 días. */
export function evaluarRuta(destino: string, llamaradas: Llamarada[]): EvaluacionRuta {
  const d = buscarDestino(destino) ?? { nombre: destino.trim(), exposicion: 1.0, diasViaje: 10 };
  const puntaje = Math.round(puntajeSolar(llamaradas) * d.exposicion * 100) / 100;
  const riesgo = nivelPorPuntaje(puntaje);
  return {
    destino: d.nombre,
    diasViaje: d.diasViaje,
    puntaje,
    riesgo,
    recomendacion: RECOMENDACIONES[riesgo],
    autorizado: riesgo !== "EXTREMO",
  };
}

/** Convierte la respuesta cruda de NASA DONKI /FLR a nuestro modelo. */
export function parsearDonki(json: unknown): Llamarada[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .filter((x) => typeof x.classType === "string" && typeof x.beginTime === "string")
    .map((x) => ({
      id: String(x.flrID ?? `${x.beginTime}-${x.classType}`),
      clase: String(x.classType),
      inicio: String(x.beginTime),
      pico: typeof x.peakTime === "string" ? x.peakTime : null,
      region: x.activeRegionNum != null ? String(x.activeRegionNum) : null,
    }));
}
