#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

DOMAIN="${DOMAIN:-turnos.andiko.cloud}"
STACK="$(stack_name)"

echo "==> curl https://${DOMAIN}/api/health"
if curl -sf "https://${DOMAIN}/api/health"; then
  echo ""
  echo "Health OK"
else
  echo ""
  echo "Health check failed" >&2
  echo "Service status:" >&2
  docker service ps "${STACK}_app" --no-trunc 2>/dev/null || true
  exit 1
fi
