#!/usr/bin/env bash
# Falla si la cobertura total es menor al umbral (por defecto 60%).
set -euo pipefail
PERFIL="${1:-coverage.out}"
UMBRAL="${2:-60}"
TOTAL=$(go tool cover -func="$PERFIL" | awk '/^total:/ {gsub("%","",$3); print $3}')
echo "Cobertura total: ${TOTAL}% (mínimo ${UMBRAL}%)"
awk -v t="$TOTAL" -v u="$UMBRAL" 'BEGIN { exit (t+0 >= u+0) ? 0 : 1 }' || {
  echo "❌ Cobertura insuficiente"; exit 1; }
echo "✅ Cobertura OK"
