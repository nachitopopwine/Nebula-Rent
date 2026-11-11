# nebula-contracts

Fuente de verdad de los contratos gRPC de **Nébula Rent**.

| Archivo | Servidor | Clientes |
|---|---|---|
| `proto/pilotos.proto` | nebula-pilotos (Go) | nebula-bff, nebula-reservas |
| `proto/reservas.proto` | nebula-reservas (Java) | nebula-bff, nebula-pagos |

Cada microservicio vive en su propio repositorio y tiene una **copia vendorizada** de los
`.proto` que usa (carpeta `proto/`), para poder compilar de forma independiente.

## Sincronizar copias

```bash
./sync.sh ../   # copia los .proto a los repos hermanos
```

## Eventos Kafka

| Tópico | Productor | Consumidor | Payload (JSON) |
|---|---|---|---|
| `reservas.creadas` | nebula-reservas | nebula-pagos | `{reservaId, pilotoId, naveId, montoTotal, creadaEn}` |
| `pagos.solicitados` | nebula-bff | nebula-pagos | `{reservaId, monto, tokenTarjeta, solicitadoEn}` |
| `pagos.procesados` | nebula-pagos | (auditoría / futuros consumidores) | `{reservaId, estado, transaccionId, procesadoEn}` |
