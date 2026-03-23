#!/bin/bash
set -e

# Creates multiple databases listed in POSTGRES_MULTIPLE_DATABASES
# (comma separated). Falls back to the Parabellum defaults when unset.

DEFAULT_DBS="parabellum_auth,parabellum_communication,parabellum_technical,parabellum_commercial,parabellum_inventory,parabellum_projects,parabellum_procurement,parabellum_customers,parabellum_hr,parabellum_billing,parabellum_Analytics,parabellum_notification"

DATABASES="${POSTGRES_MULTIPLE_DATABASES:-$DEFAULT_DBS}"

IFS=',' read -ra DBS <<< "$DATABASES"

for db in "${DBS[@]}"; do
  clean_db="$(echo "$db" | xargs)"
  if [ -z "$clean_db" ]; then
    continue
  fi

  echo "Creating database if needed: $clean_db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -v db="$clean_db" <<-'EOSQL'
    SELECT 'CREATE DATABASE ' || quote_ident(:'db')
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db')
    \gexec
  EOSQL
done
