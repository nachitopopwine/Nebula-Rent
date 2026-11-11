#!/usr/bin/env bash
# Copia los contratos a cada repo hermano que los consume.
set -euo pipefail
ROOT="${1:-..}"
HERE="$(cd "$(dirname "$0")" && pwd)"

cp "$HERE/proto/pilotos.proto"  "$ROOT/nebula-pilotos/proto/"
cp "$HERE/proto/pilotos.proto"  "$ROOT/nebula-reservas/src/main/proto/"
cp "$HERE/proto/reservas.proto" "$ROOT/nebula-reservas/src/main/proto/"
cp "$HERE/proto/reservas.proto" "$ROOT/nebula-pagos/src/NebulaPagos/Protos/"
cp "$HERE/proto/pilotos.proto"  "$ROOT/nebula-bff/proto/"
cp "$HERE/proto/reservas.proto" "$ROOT/nebula-bff/proto/"
echo "Contratos sincronizados."
