import { createClient } from "redis";
import type { Cache } from "./cache.js";

/** Caché sobre Redis (base de datos propia de este microservicio). */
export class RedisCache implements Cache {
  private constructor(private readonly cliente: ReturnType<typeof createClient>) {}

  static async conectar(url: string): Promise<RedisCache> {
    const cliente = createClient({ url });
    cliente.on("error", (err) => console.error("[redis]", err.message));
    await cliente.connect();
    return new RedisCache(cliente);
  }

  async obtener(clave: string): Promise<string | null> {
    return this.cliente.get(clave);
  }

  async guardar(clave: string, valor: string, ttlSegundos: number): Promise<void> {
    await this.cliente.set(clave, valor, { EX: ttlSegundos });
  }

  async cerrar(): Promise<void> {
    await this.cliente.quit();
  }
}
