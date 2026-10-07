#!/usr/bin/env bash
# Deploy the inactive frontend/API pair without withdrawing the live pair.
set -Eeuo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

active_file="$root_dir/docker/nginx/active-upstreams.inc"
if rg -q 'api-gateway-blue:3001' "$active_file"; then
  live_color=blue
  next_color=green
elif rg -q 'api-gateway-green:3001' "$active_file"; then
  live_color=green
  next_color=blue
else
  echo "Cannot determine the active color from $active_file" >&2
  exit 1
fi

wait_healthy() {
  local service="$1" deadline=$((SECONDS + 180)) container health
  while (( SECONDS < deadline )); do
    container="$(docker compose ps -q "$service")"
    if [[ -n "$container" ]]; then
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
      [[ "$health" == healthy ]] && return 0
      if [[ "$health" == exited || "$health" == dead ]]; then
        docker compose logs --tail=100 "$service" >&2
        return 1
      fi
    fi
    sleep 2
  done
  echo "$service did not become healthy within 180 seconds" >&2
  docker compose logs --tail=100 "$service" >&2 || true
  return 1
}

echo "Building inactive $next_color edge pair (live: $live_color)..."
docker compose build "api-gateway-$next_color" "frontend-$next_color"
docker compose up -d --no-deps "api-gateway-$next_color" "frontend-$next_color"
wait_healthy "api-gateway-$next_color"
wait_healthy "frontend-$next_color"

temp_file="$(mktemp "${active_file}.XXXXXX")"
trap 'rm -f "$temp_file"' EXIT
cat >"$temp_file" <<EOF
# Managed by scripts/deploy-blue-green.sh. Active color: $next_color.
upstream api_gateway_backend {
    zone api_gateway_backend 64k;
    server api-gateway-$next_color:3001 resolve;
}

upstream frontend_backend {
    zone frontend_backend 64k;
    server frontend-$next_color:3000 resolve;
}
EOF

# The active pair stays untouched if validation fails. The Nginx configuration
# directory is read-only inside the running proxy, so validate the candidate in
# a disposable Nginx container before replacing the bind-mounted file.
docker run --rm \
  -v "$root_dir/docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$temp_file:/etc/nginx/conf.d/active-upstreams.inc:ro" \
  nginx:1.28-alpine nginx -t
mv "$temp_file" "$active_file"
trap - EXIT
docker compose exec -T nginx nginx -s reload

echo "Deployment complete: $next_color is live; $live_color remains available for rollback."
