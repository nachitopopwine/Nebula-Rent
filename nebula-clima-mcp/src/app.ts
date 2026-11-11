import express, { type NextFunction, type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { crearServidorMcp } from "./mcp.js";
import type { ClimaService } from "./servicio.js";

/**
 * - REST  /api/v1/*  → lo consume el BFF (Python).
 * - MCP   /mcp       → Streamable HTTP (sin estado) para clientes MCP / agentes de IA.
 */
export function crearApp(servicio: ClimaService) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ estado: "ok", servicio: "nebula-clima-mcp" });
  });

  app.get("/api/v1/clima", async (req, res, next) => {
    try {
      const dias = Number(req.query.dias ?? 7);
      res.json(await servicio.climaEspacial(Number.isFinite(dias) ? dias : 7));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/v1/rutas/evaluar", async (req, res, next) => {
    const destino = String(req.query.destino ?? "");
    if (destino.trim().length < 2) {
      res.status(400).json({ error: "El parámetro 'destino' es obligatorio" });
      return;
    }
    try {
      res.json(await servicio.evaluarRuta(destino));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/v1/destinos", (_req, res) => {
    res.json(servicio.destinos());
  });

  // ---- Model Context Protocol (Streamable HTTP, modo sin estado) ----
  app.post("/mcp", async (req, res, next) => {
    try {
      const server = crearServidorMcp(servicio);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      next(err);
    }
  });

  const metodoNoPermitido = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Método no permitido (servidor MCP sin estado)" },
      id: null,
    });
  };
  app.get("/mcp", metodoNoPermitido);
  app.delete("/mcp", metodoNoPermitido);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[clima]", err);
    res.status(500).json({ error: "Error interno del servicio de clima" });
  });

  return app;
}
