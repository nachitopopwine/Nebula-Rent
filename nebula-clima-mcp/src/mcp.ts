import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ClimaService } from "./servicio.js";

const texto = (datos: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(datos, null, 2) }],
});

/**
 * Servidor MCP: expone el clima espacial como herramientas para agentes de IA
 * (p. ej. un copiloto que ayude a planificar viajes).
 */
export function crearServidorMcp(servicio: ClimaService): McpServer {
  const server = new McpServer({ name: "nebula-clima", version: "1.0.0" });

  server.tool(
    "clima_espacial",
    "Resumen de llamaradas solares (NASA DONKI) y nivel de riesgo de los últimos N días.",
    { dias: z.number().int().min(1).max(30).default(7).describe("Días hacia atrás a consultar") },
    async ({ dias }) => texto(await servicio.climaEspacial(dias)),
  );

  server.tool(
    "evaluar_ruta",
    "Evalúa si es seguro viajar a un destino según la actividad solar reciente.",
    { destino: z.string().min(2).describe("Destino, p. ej. Marte, Europa, Titán") },
    async ({ destino }) => texto(await servicio.evaluarRuta(destino)),
  );

  server.tool(
    "listar_destinos",
    "Lista los destinos operados por Nébula Rent con su exposición a radiación.",
    {},
    async () => texto(servicio.destinos()),
  );

  return server;
}
