#!/usr/bin/env bash
# Bootstrap directories and Docker secrets for the Turnos stack.
# NEVER run on a live stack that already has working secrets.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

STACK="$(stack_name)"
POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-/var/lib/turnos/postgres}"

echo "==> Creating data directories"
sudo mkdir -p "$POSTGRES_DATA_DIR"
sudo chown -R 999:999 "$POSTGRES_DATA_DIR" 2>/dev/null || true

DATABASE_URL="$(resolve_database_url)"

echo "==> Ensuring Docker secrets"
ensure_secret turnos_postgres_password "${POSTGRES_PASSWORD:?}"
ensure_secret turnos_database_url "$DATABASE_URL"
ensure_secret turnos_auth_secret "${AUTH_SECRET:?}"
ensure_secret turnos_auth_url "${AUTH_URL:-https://turnos.andiko.cloud}"
ensure_secret turnos_cap_secret "${CAP_SECRET_KEY:-cap-secret-not-configured}"

echo ""
echo "Init complete for stack ${STACK}."
echo "Next:"
echo "  1. Install HTTP nginx + reload Andiko nginx"
echo "  2. make prod-ssl"
echo "  3. make prod-ship TAG=v0.1.0   # deploy-first on empty stack, then migrate"
