#!/bin/sh
set -e

DEFAULT_DBS="parabellum_auth,parabellum_communication,parabellum_technical,parabellum_commercial,parabellum_inventory,parabellum_projects,parabellum_procurement,parabellum_customers,parabellum_hr,parabellum_billing,parabellum_Analytics,parabellum_notification"

DATABASES="${POSTGRES_MULTIPLE_DATABASES:-$DEFAULT_DBS}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "[postgres-bootstrap] Ensuring application databases exist on ${POSTGRES_HOST}:${POSTGRES_PORT}..."

IFS=','
for db in $DATABASES; do
  clean_db="$(echo "$db" | xargs)"
  if [ -z "$clean_db" ]; then
    continue
  fi

  echo "[postgres-bootstrap] Checking database: $clean_db"
  psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -v db="$clean_db" <<'EOSQL'
SELECT 'CREATE DATABASE ' || quote_ident(:'db')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db');
\gexec
EOSQL
done

echo "[postgres-bootstrap] Database bootstrap completed."
