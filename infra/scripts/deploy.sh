#!/usr/bin/env bash
# Deploy / update the Turnos Swarm stack.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env
require_tag

STACK="$(stack_name)"
export IMAGE_TAG="$TAG"
export REPO_ROOT

# envsubst for ${VAR} in docker-stack.yml
TMP="$(mktemp)"
# shellcheck disable=SC2016
envsubst '${GHCR_IMAGE} ${IMAGE_TAG} ${POSTGRES_USER} ${POSTGRES_DB} ${POSTGRES_DATA_DIR} ${NEXT_PUBLIC_BASE_URL} ${NEXT_PUBLIC_CAP_HOST} ${NEXT_PUBLIC_CAP_SITE_KEY} ${CAP_VERIFY_URL}' \
  < "${REPO_ROOT}/infra/docker-stack.yml" > "$TMP"

echo "Deploying stack ${STACK} with image ${GHCR_IMAGE}:${TAG} ..."
docker stack deploy -c "$TMP" "$STACK"
rm -f "$TMP"

echo "Stack deploy submitted. Check:"
echo "  docker service ls | grep ${STACK}"
echo "  make prod-health"
