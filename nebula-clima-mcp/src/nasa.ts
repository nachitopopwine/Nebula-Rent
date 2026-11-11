import { parsearDonki, type Llamarada } from "./dominio.js";

export type Fetch = typeof fetch;

/** Cliente de la API pública NASA DONKI (Space Weather Database Of Notifications). */
export class NasaClient {
  constructor(
    private readonly apiKey: string = "DEMO_KEY",
    private readonly fetchFn: Fetch = fetch,
    private readonly baseUrl = "https://api.nasa.gov/DONKI",
    private readonly timeoutMs = 8000,
  ) {}

  async obtenerLlamaradas(desde: string, hasta: string): Promise<Llamarada[]> {
    const url = `${this.baseUrl}/FLR?startDate=${desde}&endDate=${hasta}&api_key=${encodeURIComponent(this.apiKey)}`;
    const resp = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!resp.ok) {
      throw new Error(`NASA DONKI respondió ${resp.status}`);
    }
    return parsearDonki(await resp.json());
  }
}
