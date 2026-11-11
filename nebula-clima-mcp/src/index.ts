import { crearApp } from "./app.js";
import { MemoriaCache, type Cache } from "./cache.js";
import { NasaClient } from "./nasa.js";
import { RedisCache } from "./redis-cache.js";
import { ClimaService } from "./servicio.js";

async function main() {
  const puerto = Number(process.env.PORT ?? 3000);
  let cache: Cache;
  if (process.env.REDIS_URL) {
    cache = await RedisCache.conectar(process.env.REDIS_URL);
    console.log("[clima] usando Redis");
  } else {
    cache = new MemoriaCache();
    console.warn("[clima] REDIS_URL no definida: caché en memoria");
  }

  const servicio = new ClimaService(new NasaClient(process.env.NASA_API_KEY ?? "DEMO_KEY"), cache);
  const servidor = crearApp(servicio).listen(puerto, () => {
    console.log(`[clima] REST en :${puerto}/api/v1 · MCP en :${puerto}/mcp`);
  });

  const apagar = () => servidor.close(() => process.exit(0));
  process.on("SIGTERM", apagar);
  process.on("SIGINT", apagar);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
