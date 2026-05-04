#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
RESTART_SERVICES=1
FLUSH_REDIS=0
CLEAN_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  scripts/reset-non-auth-data.sh [options]

Options:
  --dry-run                 Show target databases without deleting data.
  --yes                     Skip the NETTOYER confirmation prompt.
  --no-restart              Do not restart application services after cleanup.
  --flush-redis             Also clear Redis caches/queues after database cleanup.
  --container <name>        PostgreSQL container name. Default: parabellum-db.
  --user <name>             PostgreSQL user. Default: DB_USER or postgres.
  --auth-db <name>          Database that must never be cleaned. Default: parabellum_auth.
  --pattern <like-pattern>  Database discovery pattern. Default: parabellum_%.
  --databases <csv>         Explicit comma-separated database list to clean.
  -h, --help                Show this help.

This script cleans all non-auth PostgreSQL service databases by delegating to
clean-non-auth-databases.sh. The auth database is always protected.
EOF
}

die() {
  echo "Erreur: $*" >&2
  exit 1
}

load_env_value() {
  local key="$1"
  local env_file="$ROOT_DIR/.env"
  local line
  [[ -f "$env_file" ]] || return 0
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  printf '%s' "${line#*=}" | sed -E 's/^["'\'']?|["'\'']?$//g'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      CLEAN_ARGS+=("$1")
      shift
      ;;
    --yes)
      CLEAN_ARGS+=("$1")
      shift
      ;;
    --no-restart)
      RESTART_SERVICES=0
      shift
      ;;
    --flush-redis)
      FLUSH_REDIS=1
      shift
      ;;
    --container|--user|--auth-db|--pattern|--databases)
      [[ $# -ge 2 ]] || die "Option $1 requiert une valeur."
      CLEAN_ARGS+=("$1" "$2")
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

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/clean-non-auth-databases.sh" "${CLEAN_ARGS[@]}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  exit 0
fi

if [[ "$FLUSH_REDIS" -eq 1 ]]; then
  REDIS_PASS="${REDIS_PASSWORD:-$(load_env_value REDIS_PASSWORD)}"
  [[ -n "$REDIS_PASS" ]] || die "REDIS_PASSWORD est requis pour --flush-redis."
  echo "[reset-data] Vidage de Redis..."
  docker compose exec -T redis redis-cli -a "$REDIS_PASS" FLUSHALL >/dev/null
fi

if [[ "$RESTART_SERVICES" -eq 1 ]]; then
  mapfile -t services_to_restart < <(
    docker compose config --services |
      grep -Ev '^(postgres|postgres-bootstrap|redis|minio|minio-init|auth-service)$'
  )

  if [[ ${#services_to_restart[@]} -gt 0 ]]; then
    echo "[reset-data] Redemarrage des services applicatifs hors auth-service..."
    docker compose restart "${services_to_restart[@]}"
  fi
fi

echo "[reset-data] Termine. Les donnees auth-service ont ete conservees."
