#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_value() {
  local key="$1"
  local env_file="$ROOT_DIR/.env"
  local line
  [[ -f "$env_file" ]] || return 0
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  printf '%s' "${line#*=}" | sed -E 's/^["'\'']?|["'\'']?$//g'
}

CONTAINER="${POSTGRES_CONTAINER:-$(load_env_value POSTGRES_CONTAINER)}"
CONTAINER="${CONTAINER:-parabellum-db}"
DB_USER="${DB_USER:-$(load_env_value DB_USER)}"
DB_USER="${DB_USER:-${POSTGRES_USER:-$(load_env_value POSTGRES_USER)}}"
DB_USER="${DB_USER:-postgres}"
AUTH_DATABASE="${AUTH_DATABASE:-parabellum_auth}"
DATABASE_PATTERN="${DATABASE_PATTERN:-parabellum_%}"
DATABASES_CSV="${DATABASES:-}"
DRY_RUN=0
YES=0

usage() {
  cat <<'EOF'
Usage:
  scripts/clean-non-auth-databases.sh [options]

Options:
  --dry-run                 List target databases and table counts without truncating.
  --yes                     Skip the interactive confirmation prompt.
  --container <name>        PostgreSQL container name. Default: parabellum-db.
  --user <name>             PostgreSQL user. Default: DB_USER or postgres.
  --auth-db <name>          Database that must never be cleaned. Default: parabellum_auth.
  --pattern <like-pattern>  Database discovery pattern. Default: parabellum_%.
  --databases <csv>         Explicit comma-separated database list to clean.
  -h, --help                Show this help.

This script truncates public tables with RESTART IDENTITY CASCADE and keeps
_prisma_migrations untouched. The auth database is always protected.
EOF
}

die() {
  echo "Erreur: $*" >&2
  exit 1
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

sql_literal() {
  local value="$1"
  value="${value//\'/\'\'}"
  printf "'%s'" "$value"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --yes)
      YES=1
      shift
      ;;
    --container)
      [[ $# -ge 2 ]] || die "Option --container requiert une valeur."
      CONTAINER="$2"
      shift 2
      ;;
    --user)
      [[ $# -ge 2 ]] || die "Option --user requiert une valeur."
      DB_USER="$2"
      shift 2
      ;;
    --auth-db)
      [[ $# -ge 2 ]] || die "Option --auth-db requiert une valeur."
      AUTH_DATABASE="$2"
      shift 2
      ;;
    --pattern)
      [[ $# -ge 2 ]] || die "Option --pattern requiert une valeur."
      DATABASE_PATTERN="$2"
      shift 2
      ;;
    --databases)
      [[ $# -ge 2 ]] || die "Option --databases requiert une valeur."
      DATABASES_CSV="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Option inconnue: $1"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "Docker est introuvable."
docker container inspect "$CONTAINER" >/dev/null 2>&1 || die "Le conteneur PostgreSQL '$CONTAINER' est introuvable ou arrete."

psql_postgres() {
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres "$@"
}

psql_database() {
  local database="$1"
  shift
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database" "$@"
}

declare -a DATABASES_TO_CLEAN=()

if [[ -n "$DATABASES_CSV" ]]; then
  IFS=',' read -r -a raw_databases <<< "$DATABASES_CSV"
  for raw_database in "${raw_databases[@]}"; do
    database="$(trim "$raw_database")"
    [[ -z "$database" ]] && continue
    DATABASES_TO_CLEAN+=("$database")
  done
else
  auth_database_sql="$(sql_literal "$AUTH_DATABASE")"
  database_pattern_sql="$(sql_literal "$DATABASE_PATTERN")"
  mapfile -t DATABASES_TO_CLEAN < <(
    psql_postgres \
      -Atc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> $auth_database_sql AND datname LIKE $database_pattern_sql ORDER BY datname;"
  )
fi

if [[ ${#DATABASES_TO_CLEAN[@]} -eq 0 ]]; then
  echo "Aucune base de donnees ciblee."
  exit 0
fi

for database in "${DATABASES_TO_CLEAN[@]}"; do
  if [[ "$database" == "$AUTH_DATABASE" ]]; then
    die "Protection active: refus de nettoyer la base auth '$AUTH_DATABASE'."
  fi
done

echo "Bases qui seront nettoyees:"
printf '  - %s\n' "${DATABASES_TO_CLEAN[@]}"
echo
echo "Base protegee: $AUTH_DATABASE"
echo "Conteneur PostgreSQL: $CONTAINER"
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Mode dry-run: aucune table ne sera videe."
  for database in "${DATABASES_TO_CLEAN[@]}"; do
    table_count="$(
      psql_database "$database" \
        -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';"
    )"
    echo "  - $database: $table_count table(s) applicative(s) ciblee(s)"
  done
  exit 0
fi

if [[ "$YES" -ne 1 ]]; then
  read -r -p "Tape NETTOYER pour confirmer la suppression des donnees hors auth-service: " confirmation
  if [[ "$confirmation" != "NETTOYER" ]]; then
    echo "Operation annulee."
    exit 0
  fi
fi

for database in "${DATABASES_TO_CLEAN[@]}"; do
  echo "[clean-db] Nettoyage de $database..."
  psql_database "$database" <<'EOSQL'
DO $$
DECLARE
  target_table record;
BEGIN
  FOR target_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  LOOP
    EXECUTE format(
      'TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE',
      target_table.schemaname,
      target_table.tablename
    );
  END LOOP;
END $$;
EOSQL
done

echo "Nettoyage termine. La base auth-service n'a pas ete modifiee."
