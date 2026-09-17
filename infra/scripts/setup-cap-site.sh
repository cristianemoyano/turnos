#!/usr/bin/env bash
# Create a Cap site key named turnos-prod against the shared Cap instance.
# Reads CAP_ADMIN_KEY from Andiko's infra/.env.production on the VPS.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

CAP_HOST="${NEXT_PUBLIC_CAP_HOST:-https://cap.andiko.cloud}"
CAP_HOST="${CAP_HOST%/}"
ANDIKO_ENV="${ANDIKO_ENV_FILE:-/root/andiko/infra/.env.production}"

if [ -z "${CAP_ADMIN_KEY:-}" ]; then
  if [ -f "$ANDIKO_ENV" ]; then
    # shellcheck disable=SC1090
    CAP_ADMIN_KEY="$(set -a; . "$ANDIKO_ENV"; set +a; echo "${CAP_ADMIN_KEY:-}")"
  fi
fi

if [ -z "${CAP_ADMIN_KEY:-}" ]; then
  echo "Error: CAP_ADMIN_KEY is empty. Set it in ${ANDIKO_ENV} or export it." >&2
  exit 1
fi

echo "==> Cap setup (${CAP_HOST}) — site turnos-prod"

LOGIN_JSON="$(curl -sS -X POST "${CAP_HOST}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"admin_key\":\"${CAP_ADMIN_KEY}\"}")"

TOKEN="$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'), d; print(d['session_token'])")"
HASH="$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['hashed_token'])")"
export TOKEN HASH
AUTH="$(python3 -c "import json,base64,os; print(base64.b64encode(json.dumps({'token':os.environ['TOKEN'],'hash':os.environ['HASH']}).encode()).decode())")"

KEYS_JSON="$(curl -sS -X POST "${CAP_HOST}/server/keys" \
  -H "Authorization: Bearer ${AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"name":"turnos-prod","permissions":{"0":0,"1":0,"2":0}}')"

SITE_KEY="$(echo "$KEYS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('siteKey', d.get('site_key', '')))")"
SECRET_KEY="$(echo "$KEYS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secretKey', d.get('secret_key', '')))")"

if [ -z "$SITE_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "Failed to create Cap site key: ${KEYS_JSON}" >&2
  exit 1
fi

echo "Created site key: ${SITE_KEY}"

ENV_FILE="${ENV_FILE:-${REPO_ROOT}/infra/.env.production}"
TMP="${ENV_FILE}.tmp"
grep -v '^NEXT_PUBLIC_CAP_SITE_KEY=' "$ENV_FILE" | grep -v '^CAP_SECRET_KEY=' > "$TMP" || true
{
  echo "NEXT_PUBLIC_CAP_SITE_KEY=${SITE_KEY}"
  echo "CAP_SECRET_KEY=${SECRET_KEY}"
} >> "$TMP"
mv "$TMP" "$ENV_FILE"

# Reload for subsequent scripts in this shell
# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

# Rotate / create turnos_cap_secret if stack may already exist
if docker secret inspect turnos_cap_secret >/dev/null 2>&1; then
  NEW_SECRET="turnos_cap_secret_$(date +%Y%m%d%H%M%S)"
  echo -n "$SECRET_KEY" | docker secret create "$NEW_SECRET" -
  echo "Created ${NEW_SECRET}. Update the stack to mount it as turnos_cap_secret (redeploy after renaming or update service)."
  echo "For a fresh init, remove the old secret after stopping the stack, or re-run after docker secret rm turnos_cap_secret."
else
  echo -n "$SECRET_KEY" | docker secret create turnos_cap_secret -
  echo "Created secret turnos_cap_secret."
fi

echo ""
echo "Cap keys written to ${ENV_FILE}."
echo "NEXT_PUBLIC_CAP_SITE_KEY is baked at image build — rebuild after this:"
echo "  make prod-build TAG=..."
