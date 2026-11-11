#!/usr/bin/env bash
# Levanta todo Nébula Rent en un clúster local de kind.
# Requisitos: docker, kind, kubectl. Los repos deben estar clonados como carpetas hermanas.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES=(nebula-bff nebula-pilotos nebula-reservas nebula-pagos nebula-clima-mcp nebula-frontend)

if ! kind get clusters | grep -q '^nebula$'; then
  kind create cluster --config "$ROOT/nebula-infra/kind-cluster.yaml"
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
  kubectl wait -n ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=180s
fi

for svc in "${SERVICES[@]}"; do
  echo ">> Construyendo $svc"
  docker build -t "ghcr.io/nebula-rent/$svc:local" "$ROOT/$svc"
  kind load docker-image "ghcr.io/nebula-rent/$svc:local" --name nebula
done

kubectl apply -k "$ROOT/nebula-infra/k8s/overlays/local"
kubectl -n nebula-rent rollout status deploy --timeout=300s

echo
echo "Listo. Agrega '127.0.0.1 nebula.localhost' a /etc/hosts y abre http://nebula.localhost"
echo "GraphQL: http://nebula.localhost/graphql"
