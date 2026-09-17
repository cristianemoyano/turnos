#!/usr/bin/env bash
# Build the Turnos production image on the VPS (or locally).
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

load_env
require_tag

IMAGE="${GHCR_IMAGE}:${TAG}"
echo "Building ${IMAGE} ..."

docker build \
  -f "${REPO_ROOT}/infra/Dockerfile" \
  --build-arg "NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-https://turnos.andiko.cloud}" \
  --build-arg "NEXT_PUBLIC_CAP_HOST=${NEXT_PUBLIC_CAP_HOST:-https://cap.andiko.cloud}" \
  --build-arg "NEXT_PUBLIC_CAP_SITE_KEY=${NEXT_PUBLIC_CAP_SITE_KEY:-}" \
  -t "$IMAGE" \
  "$REPO_ROOT"

echo "Built ${IMAGE}"
