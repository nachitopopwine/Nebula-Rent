# nebula-infra ☸️

Manifiestos de Kubernetes que orquestan **todas las imágenes Docker** de Nébula Rent en el
namespace `nebula-rent`.

```
k8s/
├── base/
│   ├── 00-namespace.yaml
│   ├── 01-config.yaml        ConfigMap + Secret (direcciones internas y credenciales)
│   ├── 10-databases.yaml     PostgreSQL, MySQL, MongoDB (StatefulSets) y Redis
│   ├── 20-kafka.yaml         Kafka KRaft + Job que crea los tópicos
│   ├── 30-apps.yaml          Deployments + Services de los 6 servicios
│   └── 40-ingress.yaml       nebula.localhost → frontend y /graphql → bff
└── overlays/local/           usa imágenes con tag "local" (para kind)
```

| Deployment | Imagen | Puerto | Probes |
|---|---|---|---|
| frontend | nebula-frontend | 8080 (svc 80) | HTTP `/` |
| bff | nebula-bff | 8000 | HTTP `/health` |
| pilotos | nebula-pilotos | 50051 | **gRPC** health nativo |
| reservas | nebula-reservas | 9090 gRPC / 8080 HTTP | actuator readiness/liveness |
| pagos | nebula-pagos | 8080 | HTTP `/health` |
| clima-mcp | nebula-clima-mcp | 3000 | HTTP `/health` |

Solo el **frontend** y el endpoint **GraphQL** del BFF salen del clúster por el Ingress.
gRPC, Kafka y el REST del MCP Server son tráfico interno.

## Levantar todo en local (kind)
```bash
# Requisitos: docker, kind, kubectl. Repos clonados como carpetas hermanas.
./deploy-local.sh
echo "127.0.0.1 nebula.localhost" | sudo tee -a /etc/hosts
open http://nebula.localhost
```

## Comandos útiles
```bash
kubectl -n nebula-rent get pods
kubectl -n nebula-rent logs deploy/pagos -f
kubectl -n nebula-rent port-forward svc/bff 8000:8000      # GraphiQL en localhost:8000/graphql
kubectl -n nebula-rent exec -it kafka-0 -- /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic pagos.procesados --from-beginning
```
