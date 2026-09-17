#!/usr/bin/env bash
# Expand the shared Andiko Let's Encrypt cert to include turnos.andiko.cloud.
# Preserves every existing SAN on the cert.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env

DOMAIN="${DOMAIN:-turnos.andiko.cloud}"
PARENT_DOMAIN="${PARENT_DOMAIN:-andiko.cloud}"
# Live Andiko nginx uses andiko.cloud-0001 (cap/analytics). Override if needed.
CERTBOT_CERT_NAME="${CERTBOT_CERT_NAME:-andiko.cloud-0001}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
CERTBOT_WWW_DIR="${CERTBOT_WWW_DIR:-/var/lib/andiko/certbot-www}"
CERTBOT_CERTS_DIR="${CERTBOT_CERTS_DIR:-/var/lib/andiko/certs}"
ANDIKO_STACK="${ANDIKO_STACK_NAME:-andiko}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/var/lib/andiko/nginx/conf.d}"
CERT_PATH="${CERTBOT_CERTS_DIR}/live/${CERTBOT_CERT_NAME}/fullchain.pem"

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "Set CERTBOT_EMAIL in infra/.env.production" >&2
  exit 1
fi

if [ ! -f "$CERT_PATH" ]; then
  # Fallback to parent domain lineage if -0001 is absent.
  CERTBOT_CERT_NAME="$PARENT_DOMAIN"
  CERT_PATH="${CERTBOT_CERTS_DIR}/live/${CERTBOT_CERT_NAME}/fullchain.pem"
fi

if [ ! -f "$CERT_PATH" ]; then
  echo "No certificate at ${CERT_PATH} — bootstrap Andiko SSL first." >&2
  exit 1
fi

echo "Using certificate lineage: ${CERTBOT_CERT_NAME}"

# Collect existing SANs so --expand does not drop any.
mapfile -t EXISTING_SANS < <(
  openssl x509 -in "$CERT_PATH" -noout -text \
    | grep -oE 'DNS:[^,[:space:]]+' \
    | sed 's/^DNS://' \
    | sort -u
)

HAS_TURNOS=0
CERTBOT_ARGS=()
for san in "${EXISTING_SANS[@]}"; do
  CERTBOT_ARGS+=(-d "$san")
  if [ "$san" = "$DOMAIN" ]; then
    HAS_TURNOS=1
  fi
done

if [ "$HAS_TURNOS" -eq 0 ]; then
  CERTBOT_ARGS+=(-d "$DOMAIN")
  echo "Expanding certificate to include ${DOMAIN} (keeping ${#EXISTING_SANS[@]} existing SANs) ..."
  docker run --rm \
    -v "${CERTBOT_CERTS_DIR}:/etc/letsencrypt" \
    -v "${CERTBOT_WWW_DIR}:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --expand \
    "${CERTBOT_ARGS[@]}"
else
  echo "${DOMAIN} already present in certificate SANs."
fi

echo "Installing HTTPS nginx config ..."
sudo mkdir -p "$NGINX_CONF_DIR"
# Ensure installed conf points at the cert lineage we expanded.
sed \
  -e "s|/etc/letsencrypt/live/andiko.cloud-0001/|/etc/letsencrypt/live/${CERTBOT_CERT_NAME}/|g" \
  -e "s|/etc/letsencrypt/live/andiko.cloud/|/etc/letsencrypt/live/${CERTBOT_CERT_NAME}/|g" \
  "${REPO_ROOT}/infra/nginx/turnos.ssl.conf" \
  | sudo tee "${NGINX_CONF_DIR}/turnos.conf" >/dev/null

NGINX_CONTAINER="$(docker ps -q -f "name=${ANDIKO_STACK}_nginx" | head -n1)"
if [ -n "$NGINX_CONTAINER" ]; then
  if docker exec "$NGINX_CONTAINER" nginx -t; then
    docker exec "$NGINX_CONTAINER" nginx -s reload
    echo "Andiko nginx reloaded."
  else
    echo "WARNING: nginx -t failed (often turnos_app not deployed yet)." >&2
    echo "Re-run make prod-ssl after: make prod-ship TAG=..." >&2
    # Keep HTTP-only bootstrap so ACME still works until stack is up.
    sudo cp "${REPO_ROOT}/infra/nginx/turnos.conf" "${NGINX_CONF_DIR}/turnos.conf"
    docker exec "$NGINX_CONTAINER" nginx -t
    docker exec "$NGINX_CONTAINER" nginx -s reload
    echo "Restored HTTP bootstrap and reloaded."
    exit 0
  fi
else
  echo "Andiko nginx container not found — reload manually after restart." >&2
fi

echo "Done. Verify:"
echo "  openssl x509 -in ${CERT_PATH} -noout -text | grep -A1 'Subject Alternative Name'"
echo "  curl -sfI https://${DOMAIN}/"
