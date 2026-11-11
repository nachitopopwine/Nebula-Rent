# nebula-frontend 🌌

Interfaz web de **Nébula Rent**: flota, pilotos, reservas, pagos y alerta de clima espacial.

| | |
|---|---|
| Stack | React 18 + TypeScript + Vite + Apollo Client |
| Comunicación | Solo GraphQL contra el BFF (`/graphql`) |
| Servido por | nginx (puerto 8080) en Kubernetes |

## Pantallas
- **Banner de clima**: riesgo solar de los últimos 7 días (NASA DONKI vía MCP Server).
- **Flota**: naves con tarifa, tripulación y licencia requerida.
- **Pilotos**: listado y registro.
- **Reservas**: nueva reserva con estimado (−10 % desde 7 días) y evaluación de la ruta; pago con
  token de prueba (`tok_visa_4242` se aprueba, `tok_rechazo_x` se rechaza). La lista se refresca
  cada 5 s porque el pago es asíncrono (Kafka).

## Desarrollo
```bash
npm install
npm run dev        # http://localhost:5173, /graphql → http://localhost:8000 (proxy de Vite)
npm run test:cov   # falla si la cobertura es < 60%
```
