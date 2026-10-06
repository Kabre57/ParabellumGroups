#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [ "$#" -ne 2 ] || [ "$2" != "--confirm-overwrite" ]; then
  echo "Usage: $0 <backup-directory> --confirm-overwrite" >&2
  exit 2
fi

SOURCE="$(realpath "$1")"
if [ ! -f "$SOURCE/SHA256SUMS" ]; then
  echo "Backup directory or SHA256SUMS file not found: $SOURCE" >&2
  exit 1
fi
(cd "$SOURCE" && sha256sum --check SHA256SUMS)

databases=(
  parabellum_auth parabellum_communication parabellum_technical
  parabellum_commercial parabellum_inventory parabellum_projects
  parabellum_procurement parabellum_customers parabellum_hr
  parabellum_billing parabellum_Analytics parabellum_notification
)
for database in "${databases[@]}"; do
  if [ ! -f "$SOURCE/$database.dump" ]; then
    echo "Missing PostgreSQL dump: $SOURCE/$database.dump" >&2
    exit 1
  fi
done

for database in "${databases[@]}"; do
  echo "Restore PostgreSQL: $database"
  docker compose exec -T postgres sh -c \
    'pg_restore --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$1"' sh "$database" \
    < "$SOURCE/$database.dump"
done

if [ -d "$SOURCE/minio" ]; then
  echo "Restore MinIO objects (matching keys are overwritten; other keys are kept)"
  docker compose run --rm --no-deps \
    --volume "$SOURCE/minio:/restore:ro" \
    --entrypoint /bin/sh minio-init -c '
      set -eu
      mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
      for bucket in "$S3_BUCKET_NAME" rapport-photos communication-attachments; do
        if [ -d "/restore/$bucket" ]; then
          mc ls "local/$bucket" >/dev/null 2>&1 || mc mb -p "local/$bucket"
          mc mirror --overwrite "/restore/$bucket" "local/$bucket"
        fi
      done
    '
fi

echo "Restore completed."
