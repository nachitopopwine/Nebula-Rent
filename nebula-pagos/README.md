# nebula-pagos 💳

Microservicio de **cobros** de Nébula Rent (pasarela simulada "Banco Galáctico").

| | |
|---|---|
| Lenguaje | C# / .NET 8 |
| Comunicación entrante | Kafka: `reservas.creadas` (desde Java) y `pagos.solicitados` (desde el BFF Python) |
| Comunicación saliente | gRPC → `nebula-reservas.ActualizarEstadoPago` · Kafka → `pagos.procesados` |
| Base de datos | MongoDB 7 (colección `cobros`) |
| HTTP | `:8080/health`, `GET /api/pagos`, `GET /api/pagos/{reservaId}` |

## Flujo
1. Java publica `reservas.creadas` → se crea un cobro `PENDIENTE`.
2. El BFF publica `pagos.solicitados` → se valida el monto, se cobra en la pasarela simulada,
   se avisa a Reservas por gRPC y se publica `pagos.procesados`.
3. Si la solicitud llega antes que el evento de reserva, se consulta la reserva por gRPC.
4. Todo es idempotente (Kafka puede reentregar mensajes).

**Tarjetas de prueba:** cualquier token es aprobado, salvo los que empiezan con `tok_rechazo`
o montos sobre 500.000 créditos.

## Desarrollo
```bash
dotnet test tests/NebulaPagos.Tests        # falla si la cobertura de líneas es < 60% (coverlet)
dotnet run --project src/NebulaPagos       # sin MONGO_URL usa memoria
```
Los adaptadores que requieren infraestructura real (Mongo, Kafka, cliente gRPC) están marcados
con `[ExcludeFromCodeCoverage]`; la lógica de negocio se prueba con dobles en memoria.
