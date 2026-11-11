# nebula-reservas 🚀

Microservicio de **naves y reservas** de Nébula Rent.

| | |
|---|---|
| Lenguaje | Java 21 + Spring Boot 3.3 |
| Comunicación entrante | gRPC `ReservaService` (puerto `9090`) ← BFF (Python) y Pagos (.NET) |
| Comunicación saliente | gRPC → `nebula-pilotos` (Go) · Kafka → tópico `reservas.creadas` |
| Base de datos | MySQL 8 |
| HTTP | `:8080/actuator/health` (probes de Kubernetes) |

## Reglas de negocio
- Licencia del piloto ≥ licencia requerida por la nave (`CLASE_A > CLASE_B > CLASE_C`).
- Entre 1 y 30 días; **10 % de descuento** desde 7 días.
- Al crear una reserva se publica `reservas.creadas` y queda con pago `PENDIENTE`.
- `ActualizarEstadoPago` (lo llama Pagos): `APROBADO` confirma; `RECHAZADO` cancela la reserva. Es idempotente.
- Al arrancar siembra 6 naves si la tabla está vacía.

## Desarrollo
```bash
mvn verify            # compila protos, corre tests y exige ≥ 60 % de cobertura (JaCoCo)
mvn spring-boot:run   # requiere MySQL, Kafka y nebula-pilotos
grpcurl -plaintext localhost:9090 list
```
Reporte de cobertura: `target/site/jacoco/index.html`.
