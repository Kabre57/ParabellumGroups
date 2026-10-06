#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT%/}/$STAMP"

mkdir -p "$DEST/minio"
DEST="$(realpath "$DEST")"

databases=(
  parabellum_auth parabellum_communication parabellum_technical
  parabellum_commercial parabellum_inventory parabellum_projects
  parabellum_procurement parabellum_customers parabellum_hr
  parabellum_billing parabellum_Analytics parabellum_notification
)

for database in "${databases[@]}"; do
  echo "Export PostgreSQL: $database"
  docker compose exec -T postgres sh -c \
    'pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" "$1"' sh "$database" \
    > "$DEST/$database.dump"
done

echo "Export PostgreSQL globals"
docker compose exec -T postgres sh -c \
  'pg_dumpall --globals-only -U "$POSTGRES_USER"' \
  | gzip -c > "$DEST/postgres-globals.sql.gz"

echo "Export MinIO buckets"
docker compose run --rm --no-deps \
  --volume "$DEST/minio:/backup" \
  --entrypoint /bin/sh minio-init -c '
    set -eu
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    for bucket in "$S3_BUCKET_NAME" rapport-photos communication-attachments; do
      mkdir -p "/backup/$bucket"
      mc mirror --overwrite "local/$bucket" "/backup/$bucket"
    done
  '

(
  cd "$DEST"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

echo "Backup completed: $DEST"
