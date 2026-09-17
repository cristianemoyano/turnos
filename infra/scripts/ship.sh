#!/usr/bin/env bash
# Orchestrator for routine Turnos releases on the VPS.
# SCOPE=app (default): build + migrate + deploy + health
# SCOPE=infra: same, for stack/yml changes
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

SCOPE="${SCOPE:-app}"
if [ -z "${TAG:-}" ]; then
  TAG="v$(node -p "require('${REPO_ROOT}/package.json').version")"
  export TAG
fi
require_tag

echo "==> prod-ship SCOPE=${SCOPE} TAG=${TAG}"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  TAG="$TAG" bash "$SCRIPT_DIR/build.sh"
fi

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  TAG="$TAG" bash "$SCRIPT_DIR/migrate.sh" up
fi

TAG="$TAG" bash "$SCRIPT_DIR/deploy.sh"

# Give the service a moment to converge before health
sleep 8
bash "$SCRIPT_DIR/health.sh"

echo "Ship complete: https://${DOMAIN:-turnos.andiko.cloud}"
