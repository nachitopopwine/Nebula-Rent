import { describe, expect, it } from "vitest";
import {
  buscarDestino,
  evaluarRuta,
  mayorClase,
  nivelPorPuntaje,
  parsearDonki,
  pesoLlamarada,
  puntajeSolar,
  type Llamarada,
} from "../src/dominio.js";

const l = (clase: string, inicio = "2026-11-10T10:00Z"): Llamarada => ({
  id: `${clase}-${inicio}`,
  clase,
  inicio,
  pico: null,
  region: null,
});

describe("pesoLlamarada", () => {
  it.each([
    ["X2.0", 20],
    ["M1.5", 1.5],
    ["C3", 0.3],
    ["B1.0", 0.01],
    ["m", 1],
    ["Z9", 0],
    ["", 0],
  ])("%s pesa %d", (clase, peso) => {
    expect(pesoLlamarada(clase)).toBeCloseTo(peso, 5);
  });
});

describe("agregados", () => {
  const datos = [l("C1.0"), l("M2.0"), l("X1.1"), l("B5.0")];

  it("encuentra la mayor clase", () => {
    expect(mayorClase(datos)).toBe("X1.1");
    expect(mayorClase([])).toBeNull();
  });

  it("suma el puntaje solar", () => {
    expect(puntajeSolar(datos)).toBeCloseTo(0.1 + 2 + 11 + 0.05, 5);
  });

  it.each([
    [0, "BAJO"],
    [1.99, "BAJO"],
    [2, "MODERADO"],
    [9.9, "MODERADO"],
    [10, "ALTO"],
    [30, "EXTREMO"],
  ])("puntaje %d → %s", (puntaje, nivel) => {
    expect(nivelPorPuntaje(puntaje)).toBe(nivel);
  });
});

describe("evaluarRuta", () => {
  it("busca destinos sin importar tildes ni mayúsculas", () => {
    expect(buscarDestino("titan")?.nombre).toBe("Titán");
    expect(buscarDestino("ENCELADO")?.nombre).toBe("Encélado");
    expect(buscarDestino("Plutón")).toBeUndefined();
  });

  it("autoriza con baja actividad", () => {
    const r = evaluarRuta("Luna", [l("C1.0")]);
    expect(r).toMatchObject({ destino: "Luna", riesgo: "BAJO", autorizado: true, diasViaje: 1 });
  });

  it("aplica la exposición del destino", () => {
    // 2 llamaradas X1 = 20 puntos; Europa ×1.4 = 28 → ALTO
    const r = evaluarRuta("Europa", [l("X1"), l("X1")]);
    expect(r.puntaje).toBe(28);
    expect(r.riesgo).toBe("ALTO");
  });

  it("suspende vuelos con tormenta extrema", () => {
    const r = evaluarRuta("Marte", [l("X9.0"), l("X5.0")]);
    expect(r.riesgo).toBe("EXTREMO");
    expect(r.autorizado).toBe(false);
  });

  it("usa valores por defecto para destinos desconocidos", () => {
    const r = evaluarRuta("  Kepler-22b ", []);
    expect(r).toMatchObject({ destino: "Kepler-22b", diasViaje: 10, riesgo: "BAJO" });
  });
});

describe("parsearDonki", () => {
  it("convierte la respuesta de NASA y descarta basura", () => {
    const crudo = [
      { flrID: "2026-11-10-FLR-001", classType: "M1.2", beginTime: "2026-11-10T01:00Z", peakTime: "2026-11-10T01:10Z", activeRegionNum: 13900 },
      { classType: "C2.0", beginTime: "2026-11-09T05:00Z" },
      { classType: 5 },
      null,
      "texto",
    ];
    const r = parsearDonki(crudo);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ id: "2026-11-10-FLR-001", clase: "M1.2", inicio: "2026-11-10T01:00Z", pico: "2026-11-10T01:10Z", region: "13900" });
    expect(r[1]).toMatchObject({ id: "2026-11-09T05:00Z-C2.0", pico: null, region: null });
  });

  it("devuelve vacío si no es un arreglo", () => {
    expect(parsearDonki({ error: "x" })).toEqual([]);
  });
});
