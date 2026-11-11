#!/usr/bin/env bash
# Genera los stubs gRPC de Python en app/gen a partir de proto/*.proto.
# El mapeo "app/gen=proto" hace que los imports generados sean "from app.gen import ...".
set -euo pipefail
cd "$(dirname "$0")/.."
python -m grpc_tools.protoc \
  --proto_path=app/gen=proto \
  --python_out=. \
  --pyi_out=. \
  --grpc_python_out=. \
  app/gen/pilotos.proto app/gen/reservas.proto
echo "Stubs generados en app/gen/"
