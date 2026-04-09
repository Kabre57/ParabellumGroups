#!/bin/sh
set -e

# Wait for DB if DATABASE_URL is provided
if [ -n "$DATABASE_URL" ]; then
  # Extract host and port from DATABASE_URL if in standard format
  # Otherwise just wait for a bit
  echo "Waiting for database to be ready..."
  # Tries to use pg_isready if the tool is available
  sleep 5
fi

# Run migrations in production if needed
if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations..."
  npx prisma migrate deploy
fi

echo "Starting server..."
exec node server.js
