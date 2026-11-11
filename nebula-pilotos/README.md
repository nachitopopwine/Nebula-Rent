# nebula-pilotos 🧑‍🚀

Microservicio de **pilotos** de Nébula Rent.

| | |
|---|---|
| Lenguaje | Go 1.24 |
| Comunicación | gRPC (`proto/pilotos.proto`) en el puerto `50051` |
| Base de datos | PostgreSQL 16 |
| Consumido por | `nebula-bff` (Python) y `nebula-reservas` (Java) |

## Reglas de negocio
- Nombre de 3 a 80 caracteres, licencia `CLASE_A | CLASE_B | CLASE_C`, horas de vuelo entre 0 y 100.000.
- Si la base está vacía, al arrancar siembra 3 pilotos de demostración.
- Sin `DATABASE_URL` funciona con un repositorio en memoria (modo dev).

## Desarrollo
```bash
make proto          # genera gen/pilotosv1 (requiere protoc, protoc-gen-go y protoc-gen-go-grpc)
go mod tidy         # la primera vez: genera go.sum (commitéalo)
make test
make cover          # falla si la cobertura es < 60%
make run
grpcurl -plaintext localhost:50051 list
```

## Estructura
```
cmd/server          punto de entrada (gRPC + health + reflection)
internal/dominio    reglas de negocio y casos de uso (sin dependencias externas)
internal/repositorio  PostgreSQL y memoria
internal/grpcapi    adaptador gRPC ↔ dominio
```

## CI
`.github/workflows/ci.yml`: genera el código protobuf, ejecuta los tests (incluida la integración con
PostgreSQL como service container), exige **≥ 60 % de cobertura** y publica la imagen en GHCR.
