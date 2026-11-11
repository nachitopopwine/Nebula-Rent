import { describe, expect, it, vi } from "vitest";
import { MemoriaCache } from "../src/cache.js";
import type { Llamarada } from "../src/dominio.js";
import { NasaClient } from "../src/nasa.js";
import { ClimaService, type FuenteLlamaradas } from "../src/servicio.js";

const AHORA = new Date("2026-11-11T12:00:00Z");
const llamaradas: Llamarada[] = [
  { id: "1", clase: "M2.0", inicio: "2026-11-09T01:00Z", pico: null, region: null },
  { id: "2", clase: "X1.0", inicio: "2026-11-10T01:00Z", pico: null, region: null },
];

function fuente(datos = llamaradas): FuenteLlamaradas & { llamadas: string[][] } {
  const llamadas: string[][] = [];
  return {
    llamadas,
    async obtenerLlamaradas(desde, hasta) {
      llamadas.push([desde, hasta]);
      return datos;
    },
  };
}

describe("ClimaService", () => {
  it("resume el clima y ordena de más reciente a más antiguo", async () => {
    const f = fuente();
    const s = new ClimaService(f, new MemoriaCache(), () => AHORA);

    const r = await s.climaEspacial(7);

    expect(f.llamadas[0]).toEqual(["2026-11-04", "2026-11-11"]);
    expect(r).toMatchObject({ totalLlamaradas: 2, mayorClase: "X1.0", puntaje: 12, nivelRiesgo: "ALTO", origen: "NASA_DONKI" });
    expect(r.llamaradas.map((x) => x.id)).toEqual(["2", "1"]);
  });

  it("usa la caché en la segunda consulta", async () => {
    const f = fuente();
    const s = new ClimaService(f, new MemoriaCache(), () => AHORA);
    await s.climaEspacial(3);
    const r = await s.climaEspacial(3);
    expect(r.origen).toBe("CACHE");
    expect(f.llamadas).toHaveLength(1);
  });

  it("acota los días entre 1 y 30", async () => {
    const f = fuente([]);
    const s = new ClimaService(f, new MemoriaCache(), () => AHORA);
    await s.climaEspacial(500);
    await s.climaEspacial(-4);
    expect(f.llamadas[0][0]).toBe("2026-10-12");
    expect(f.llamadas[1][0]).toBe("2026-11-10");
  });

  it("degrada a SIN_DATOS si NASA falla", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = new ClimaService(
      { obtenerLlamaradas: async () => { throw new Error("429"); } },
      new MemoriaCache(),
      () => AHORA,
    );
    const r = await s.climaEspacial();
    expect(r).toMatchObject({ origen: "SIN_DATOS", totalLlamaradas: 0, nivelRiesgo: "BAJO", mayorClase: null });
  });

  it("evalúa rutas con los últimos 3 días", async () => {
    const f = fuente();
    const s = new ClimaService(f, new MemoriaCache(), () => AHORA);
    const r = await s.evaluarRuta("Luna");
    expect(f.llamadas[0]).toEqual(["2026-11-08", "2026-11-11"]);
    expect(r).toMatchObject({ destino: "Luna", riesgo: "MODERADO", origen: "NASA_DONKI" });
    await expect(s.evaluarRuta(" ")).rejects.toThrow("obligatorio");
    expect(s.destinos().length).toBeGreaterThan(3);
  });
});

describe("MemoriaCache", () => {
  it("expira las entradas", async () => {
    let t = 0;
    const c = new MemoriaCache(() => t);
    await c.guardar("k", "v", 10);
    expect(await c.obtener("k")).toBe("v");
    t = 10_000;
    expect(await c.obtener("k")).toBeNull();
    expect(await c.obtener("otra")).toBeNull();
  });
});

describe("NasaClient", () => {
  it("arma la URL y parsea la respuesta", async () => {
    const fetchFalso = vi.fn(async () =>
      new Response(JSON.stringify([{ flrID: "a", classType: "C1", beginTime: "2026-11-10T00:00Z" }]), { status: 200 }),
    );
    const c = new NasaClient("MI_KEY", fetchFalso as unknown as typeof fetch, "https://nasa.test");
    const r = await c.obtenerLlamaradas("2026-11-01", "2026-11-11");
    expect(r).toHaveLength(1);
    expect(fetchFalso.mock.calls[0][0]).toBe("https://nasa.test/FLR?startDate=2026-11-01&endDate=2026-11-11&api_key=MI_KEY");
  });

  it("lanza error si NASA responde con error", async () => {
    const c = new NasaClient("k", (async () => new Response("", { status: 429 })) as unknown as typeof fetch);
    await expect(c.obtenerLlamaradas("a", "b")).rejects.toThrow("429");
  });
});
