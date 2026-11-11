import type { Cache } from "./cache.js";
import {
  DESTINOS,
  evaluarRuta,
  mayorClase,
  nivelPorPuntaje,
  puntajeSolar,
  type Destino,
  type EvaluacionRuta,
  type Llamarada,
  type NivelRiesgo,
} from "./dominio.js";

export interface FuenteLlamaradas {
  obtenerLlamaradas(desde: string, hasta: string): Promise<Llamarada[]>;
}

export type Origen = "NASA_DONKI" | "CACHE" | "SIN_DATOS";

export interface ResumenClima {
  desde: string;
  hasta: string;
  totalLlamaradas: number;
  mayorClase: string | null;
  puntaje: number;
  nivelRiesgo: NivelRiesgo;
  llamaradas: Llamarada[];
  origen: Origen;
}

const TTL_SEGUNDOS = 30 * 60;
const MAX_LLAMARADAS = 10;

export class ClimaService {
  constructor(
    private readonly fuente: FuenteLlamaradas,
    private readonly cache: Cache,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  /** Resumen de los últimos `dias` días (1 a 30). */
  async climaEspacial(dias = 7): Promise<ResumenClima> {
    const d = Math.min(Math.max(Math.trunc(dias) || 7, 1), 30);
    const hasta = this.ahora();
    const desde = new Date(hasta.getTime() - d * 24 * 60 * 60 * 1000);
    const [ini, fin] = [aFecha(desde), aFecha(hasta)];

    const { llamaradas, origen } = await this.obtener(ini, fin);
    const puntaje = Math.round(puntajeSolar(llamaradas) * 100) / 100;
    return {
      desde: ini,
      hasta: fin,
      totalLlamaradas: llamaradas.length,
      mayorClase: mayorClase(llamaradas),
      puntaje,
      nivelRiesgo: nivelPorPuntaje(puntaje),
      llamaradas: [...llamaradas].sort((a, b) => b.inicio.localeCompare(a.inicio)).slice(0, MAX_LLAMARADAS),
      origen,
    };
  }

  /** Evalúa una ruta usando el clima de los últimos 3 días. */
  async evaluarRuta(destino: string): Promise<EvaluacionRuta & { origen: Origen }> {
    if (!destino || destino.trim().length < 2) {
      throw new Error("El destino es obligatorio");
    }
    const hasta = this.ahora();
    const desde = new Date(hasta.getTime() - 3 * 24 * 60 * 60 * 1000);
    const { llamaradas, origen } = await this.obtener(aFecha(desde), aFecha(hasta));
    return { ...evaluarRuta(destino, llamaradas), origen };
  }

  destinos(): readonly Destino[] {
    return DESTINOS;
  }

  private async obtener(desde: string, hasta: string): Promise<{ llamaradas: Llamarada[]; origen: Origen }> {
    const clave = `clima:flr:${desde}:${hasta}`;
    const enCache = await this.cache.obtener(clave);
    if (enCache) {
      return { llamaradas: JSON.parse(enCache) as Llamarada[], origen: "CACHE" };
    }
    try {
      const llamaradas = await this.fuente.obtenerLlamaradas(desde, hasta);
      await this.cache.guardar(clave, JSON.stringify(llamaradas), TTL_SEGUNDOS);
      return { llamaradas, origen: "NASA_DONKI" };
    } catch (err) {
      // Si la API externa falla, no botamos el flujo de reservas.
      console.warn("[clima] NASA DONKI no disponible:", (err as Error).message);
      return { llamaradas: [], origen: "SIN_DATOS" };
    }
  }
}

function aFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}
