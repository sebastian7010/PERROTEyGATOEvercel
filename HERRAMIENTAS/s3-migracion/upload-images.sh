#!/usr/bin/env bash
set -euo pipefail

: "${IMG_DIR:?Falta IMG_DIR}"
: "${BUCKET:?Falta BUCKET}"

REGION="${REGION:-${AWS_REGION:-}}"
: "${REGION:?Falta REGION o AWS_REGION}"

PREFIX="${PREFIX:-imagenes-webp}"
DEST="s3://${BUCKET}/${PREFIX}/"

aws s3 sync "$IMG_DIR" "$DEST" \
  --exclude "*" \
  --include "*.jpg" \
  --include "*.jpeg" \
  --include "*.png" \
  --include "*.webp" \
  --include "*.gif" \
  --include "*.avif" \
  --include "*.svg" \
  --region "$REGION" \
  --size-only
