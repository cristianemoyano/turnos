#!/usr/bin/env bash
# Install the HTTP-only Turnos vhost so ACME can challenge before SSL expand.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

NGINX_CONF_DIR="${NGINX_CONF_DIR:-/var/lib/andiko/nginx/conf.d}"
ANDIKO_STACK="${ANDIKO_STACK_NAME:-andiko}"

sudo mkdir -p "$NGINX_CONF_DIR"
sudo cp "${REPO_ROOT}/infra/nginx/turnos.conf" "${NGINX_CONF_DIR}/turnos.conf"
echo "Installed HTTP bootstrap → ${NGINX_CONF_DIR}/turnos.conf"

NGINX_CONTAINER="$(docker ps -q -f "name=${ANDIKO_STACK}_nginx" | head -n1)"
if [ -n "$NGINX_CONTAINER" ]; then
  docker exec "$NGINX_CONTAINER" nginx -t
  docker exec "$NGINX_CONTAINER" nginx -s reload
  echo "Andiko nginx reloaded."
else
  echo "Andiko nginx container not found." >&2
  exit 1
fi
