#!/usr/bin/env bash
# Crea un repositorio en GitHub por cada servicio y sube su rama main.
# Uso: ./publicar-repos.sh <usuario-u-organizacion> [--public]
set -euo pipefail
OWNER="${1:?Indica el usuario u organización de GitHub}"
VISIBILIDAD="${2:---private}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
REPOS=(nebula-contracts nebula-infra nebula-bff nebula-pilotos nebula-reservas nebula-pagos nebula-clima-mcp nebula-frontend)

for repo in "${REPOS[@]}"; do
  echo ">> $OWNER/$repo"
  cd "$ROOT/$repo"
  if ! gh repo view "$OWNER/$repo" >/dev/null 2>&1; then
    gh repo create "$OWNER/$repo" "$VISIBILIDAD" --source . --remote origin
  fi
  git push -u origin main
done

echo
echo "Listo. Recuerda actualizar 'ghcr.io/nebula-rent' por 'ghcr.io/$OWNER' en nebula-infra/k8s si usarás GHCR."
