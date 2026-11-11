# nebula-clima-mcp ☀️

**MCP Server** de clima espacial de Nébula Rent. Consulta la API pública
[NASA DONKI](https://api.nasa.gov/) (llamaradas solares) y calcula el riesgo de radiación por ruta.

| | |
|---|---|
| Lenguaje | TypeScript (Node 20) + Express |
| Comunicación entrante | **REST** `/api/v1/*` ← BFF (Python) · **MCP** Streamable HTTP `/mcp` ← agentes de IA |
| Comunicación saliente | HTTPS → NASA DONKI (API externa) |
| Base de datos | Redis (caché de 30 min de las respuestas de NASA) |

## REST
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/clima?dias=7` | Resumen de llamaradas y nivel de riesgo (`BAJO`…`EXTREMO`) |
| GET | `/api/v1/rutas/evaluar?destino=Marte` | Riesgo para un destino y si el vuelo está autorizado |
| GET | `/api/v1/destinos` | Destinos operados |
| GET | `/health` | Salud |

## Herramientas MCP
`clima_espacial(dias)`, `evaluar_ruta(destino)`, `listar_destinos()`.

Para conectarlo a un cliente MCP (por ejemplo Claude Desktop o el MCP Inspector):
```bash
npx @modelcontextprotocol/inspector   # URL: http://localhost:3000/mcp  (Streamable HTTP)
```

## Desarrollo
```bash
npm install
npm run dev          # sin REDIS_URL usa caché en memoria; NASA_API_KEY por defecto DEMO_KEY
npm run test:cov     # falla si la cobertura es < 60%
```
Si NASA no responde (p. ej. límite de `DEMO_KEY`), el servicio responde con `origen: "SIN_DATOS"`
en vez de fallar, para no bloquear las reservas.
