#!/usr/bin/env bash
# Run Umzug migrations against the Turnos Postgres service.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env
require_tag

STACK="$(stack_name)"
NETWORK="$(internal_network)"
IMAGE="${GHCR_IMAGE}:${TAG}"
CMD="${1:-up}"

DATABASE_URL="$(resolve_database_url)"

run_migrate() {
  docker run --rm \
    --network "$NETWORK" \
    -e NODE_ENV=development \
    -e DATABASE_URL="$DATABASE_URL" \
    -e AUTH_SECRET="${AUTH_SECRET}" \
    -e AUTH_URL="${AUTH_URL:-https://turnos.andiko.cloud}" \
    "$IMAGE" \
    node --import tsx src/db/migrate.ts "$@"
}

case "$CMD" in
  up)
    echo "Running migrations on ${IMAGE} ..."
    # Wait for postgres service to be reachable on the stack network
    for i in $(seq 1 30); do
      if docker run --rm --network "$NETWORK" postgres:16-alpine \
        pg_isready -h postgres -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
        break
      fi
      echo "Waiting for postgres (${i}/30) ..."
      sleep 2
    done
    run_migrate up
    echo "Migrations complete."
    ;;
  status)
    run_migrate status
    ;;
  *)
    echo "Usage: migrate.sh [up|status]" >&2
    exit 1
    ;;
esac
