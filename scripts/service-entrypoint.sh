#!/bin/sh
set -e

SERVICE_NAME="${SERVICE_NAME:-$(basename "$PWD")}"

echo "[service-entrypoint] Preparing database for ${SERVICE_NAME}..."

if [ -d "prisma/migrations" ] && [ "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" -gt 0 ]; then
  echo "[service-entrypoint] Running prisma migrate deploy..."
  if npx prisma migrate deploy; then
    echo "[service-entrypoint] Prisma migrations applied for ${SERVICE_NAME}."
    echo "[service-entrypoint] Synchronizing current Prisma schema for ${SERVICE_NAME}..."
    npx prisma db push --accept-data-loss --skip-generate
  else
    echo "[service-entrypoint] prisma migrate deploy failed for ${SERVICE_NAME}, falling back to prisma db push..."
    npx prisma db push --accept-data-loss --skip-generate
  fi
elif [ -f "prisma/schema.prisma" ]; then
  echo "[service-entrypoint] No migrations found for ${SERVICE_NAME}, running prisma db push..."
  npx prisma db push --accept-data-loss --skip-generate
fi

echo "[service-entrypoint] Starting ${SERVICE_NAME}..."
exec npm start
