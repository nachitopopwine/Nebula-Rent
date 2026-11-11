import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { crearApp } from "../src/app.js";
import { MemoriaCache } from "../src/cache.js";
import { crearServidorMcp } from "../src/mcp.js";
import { ClimaService } from "../src/servicio.js";

const AHORA = new Date("2026-11-11T12:00:00Z");
const servicio = new ClimaService(
  {
    obtenerLlamaradas: async () => [
      { id: "1", clase: "M3.0", inicio: "2026-11-10T00:00Z", pico: null, region: null },
    ],
  },
  new MemoriaCache(),
  () => AHORA,
);

describe("API REST (consumida por el BFF)", () => {
  const app = crearApp(servicio);

  it("GET /health", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.body.estado).toBe("ok");
  });

  it("GET /api/v1/clima", async () => {
    const r = await request(app).get("/api/v1/clima?dias=5");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ desde: "2026-11-06", totalLlamaradas: 1, nivelRiesgo: "MODERADO" });
  });

  it("GET /api/v1/clima con días inválidos usa 7", async () => {
    const r = await request(app).get("/api/v1/clima?dias=abc");
    expect(r.body.desde).toBe("2026-11-04");
  });

  it("GET /api/v1/rutas/evaluar", async () => {
    const ok = await request(app).get("/api/v1/rutas/evaluar").query({ destino: "Marte" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ destino: "Marte", riesgo: "MODERADO", autorizado: true });

    const malo = await request(app).get("/api/v1/rutas/evaluar");
    expect(malo.status).toBe(400);
  });

  it("GET /api/v1/destinos", async () => {
    const r = await request(app).get("/api/v1/destinos");
    expect(r.body.map((d: { nombre: string }) => d.nombre)).toContain("Europa");
  });

  it("GET /mcp no está permitido en modo sin estado", async () => {
    expect((await request(app).get("/mcp")).status).toBe(405);
    expect((await request(app).delete("/mcp")).status).toBe(405);
  });

  it("responde 500 ante errores inesperados", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const roto = crearApp({
      climaEspacial: async () => { throw new Error("boom"); },
    } as unknown as ClimaService);
    const r = await request(roto).get("/api/v1/clima");
    expect(r.status).toBe(500);
  });
});

describe("Servidor MCP", () => {
  async function conectar() {
    const [clienteT, servidorT] = InMemoryTransport.createLinkedPair();
    const server = crearServidorMcp(servicio);
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(servidorT), client.connect(clienteT)]);
    return client;
  }

  it("lista las herramientas", async () => {
    const client = await conectar();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["clima_espacial", "evaluar_ruta", "listar_destinos"]);
  });

  it("ejecuta las herramientas", async () => {
    const client = await conectar();
    const leer = (r: Awaited<ReturnType<typeof client.callTool>>) =>
      JSON.parse((r.content as Array<{ text: string }>)[0].text);

    const clima = leer(await client.callTool({ name: "clima_espacial", arguments: { dias: 2 } }));
    expect(clima.nivelRiesgo).toBe("MODERADO");

    const ruta = leer(await client.callTool({ name: "evaluar_ruta", arguments: { destino: "Titán" } }));
    expect(ruta.destino).toBe("Titán");

    const destinos = leer(await client.callTool({ name: "listar_destinos", arguments: {} }));
    expect(destinos).toHaveLength(6);
  });

  it("acepta peticiones MCP por HTTP en /mcp", async () => {
    const r = await request(crearApp(servicio))
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } },
      });
    expect(r.status).toBe(200);
    expect(r.text).toContain("nebula-clima");
  });
});
