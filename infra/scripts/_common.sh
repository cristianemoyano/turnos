#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(CDPATH= cd "$SCRIPT_DIR/../.." && pwd)"
fi

ENV_FILE="${REPO_ROOT}/infra/.env.production"

load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE — copy infra/.env.production.example and fill in values." >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

require_tag() {
  if [ -z "${TAG:-}" ]; then
    echo "TAG is required (e.g. make prod-deploy TAG=v0.1.0)" >&2
    exit 1
  fi
  export IMAGE_TAG="$TAG"
}

stack_name() {
  echo "${STACK_NAME:-turnos}"
}

internal_network() {
  echo "$(stack_name)_internal"
}

# Percent-encode for DATABASE_URL
urlencode() {
  python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
}

build_database_url() {
  local user="${1:?user}"
  local password="${2:?password}"
  local host="${3:-postgres}"
  local port="${4:-5432}"
  local db="${5:?db}"
  echo "postgresql://$(urlencode "$user"):$(urlencode "$password")@${host}:${port}/${db}"
}

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    echo "$DATABASE_URL"
    return
  fi
  build_database_url \
    "${POSTGRES_USER:?}" \
    "${POSTGRES_PASSWORD:?}" \
    postgres \
    5432 \
    "${POSTGRES_DB:?}"
}

ensure_secret() {
  local name="$1"
  local value="$2"
  if docker secret inspect "$name" >/dev/null 2>&1; then
    echo "Secret ${name} already exists — skipping."
    return
  fi
  echo -n "$value" | docker secret create "$name" -
  echo "Created secret ${name}."
}
