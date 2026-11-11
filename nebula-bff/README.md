# nebula-bff 🛰️

**BFF / API Gateway** de Nébula Rent. Es el único servicio expuesto al frontend: publica un
endpoint **GraphQL** en `/graphql` y traduce cada operación a los protocolos internos.

| | |
|---|---|
| Lenguaje | Python 3.12 · FastAPI · Strawberry GraphQL |
| Comunicación entrante | GraphQL (HTTP) ← frontend React |
| Comunicación saliente | **gRPC** → pilotos (Go) y reservas (Java) · **Kafka** → pagos (.NET) · **REST** → clima MCP (TypeScript) |
| Base de datos | Ninguna (es stateless) |

## Operaciones GraphQL
```graphql
query {
  pilotos { id nombre licencia horasVuelo }
  naves { id nombre clase licenciaRequerida tarifaDiaria }
  reservas(pilotoId: "…") { id destino montoTotal estadoPago piloto { nombre } nave { nombre } }
  climaEspacial(dias: 7) { nivelRiesgo mayorClase llamaradas { clase inicio } }
  evaluarRuta(destino: "Europa") { riesgo autorizado recomendacion }
}

mutation {
  crearPiloto(input: { nombre: "Tomás Cometa", licencia: "CLASE_B", horasVuelo: 640 }) { id }
  crearReserva(input: { pilotoId: "…", naveId: "NV-003", destino: "Marte", dias: 7 }) {
    reserva { id montoTotal } evaluacionRuta { riesgo }
  }
  pagarReserva(reservaId: "…", tokenTarjeta: "tok_visa_4242") { estado mensaje }
}
```

### Orquestación
- `crearReserva` consulta primero el clima espacial (REST al MCP Server). Si el riesgo es
  `EXTREMO` bloquea la reserva; si el clima no responde, reserva igual (degradación elegante).
- `pagarReserva` valida la reserva por gRPC y publica `pagos.solicitados` en Kafka; .NET la procesa
  de forma asíncrona y actualiza el estado en Java vía gRPC.

## Desarrollo
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
bash scripts/gen_proto.sh          # genera app/gen/*_pb2*.py
pytest                             # falla si la cobertura es < 60%
uvicorn app.main:app --reload      # GraphiQL en http://localhost:8000/graphql
```
