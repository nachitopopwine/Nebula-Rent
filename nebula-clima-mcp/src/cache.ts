/** Caché clave-valor con expiración. Redis en producción, memoria en tests/dev. */
export interface Cache {
  obtener(clave: string): Promise<string | null>;
  guardar(clave: string, valor: string, ttlSegundos: number): Promise<void>;
}

export class MemoriaCache implements Cache {
  private readonly datos = new Map<string, { valor: string; expira: number }>();

  constructor(private readonly ahora: () => number = Date.now) {}

  async obtener(clave: string): Promise<string | null> {
    const entrada = this.datos.get(clave);
    if (!entrada) return null;
    if (entrada.expira <= this.ahora()) {
      this.datos.delete(clave);
      return null;
    }
    return entrada.valor;
  }

  async guardar(clave: string, valor: string, ttlSegundos: number): Promise<void> {
    this.datos.set(clave, { valor, expira: this.ahora() + ttlSegundos * 1000 });
  }
}
