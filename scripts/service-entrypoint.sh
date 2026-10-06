#!/bin/sh
set -e

SERVICE_NAME="${SERVICE_NAME:-$(basename "$PWD")}"

echo "[service-entrypoint] Preparing database for ${SERVICE_NAME}..."

if [ -f "prisma/schema.prisma" ]; then
  if [ ! -d "prisma/migrations" ] || [ -z "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -print -quit)" ]; then
    echo "[service-entrypoint] ERROR: no versioned Prisma migrations found for ${SERVICE_NAME}. Refusing to modify the database schema."
    exit 1
  fi

  echo "[service-entrypoint] Applying versioned Prisma migrations..."
  pnpm exec prisma migrate deploy --schema=prisma/schema.prisma
  echo "[service-entrypoint] Prisma migrations applied for ${SERVICE_NAME}."
fi

echo "[service-entrypoint] Starting ${SERVICE_NAME}..."
exec pnpm start
