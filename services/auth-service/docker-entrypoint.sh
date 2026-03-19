#!/bin/bash
set -e

echo "🚀 Démarrage du auth-service..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de la base de données..."
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-parabellum_auth}"

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL n'est pas encore prêt - attente..."
  sleep 2
done

echo "✅ PostgreSQL est prêt !"

# Vérifier si les tables existent
echo "🔍 Vérification de l'état de la base de données..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -eq "0" ]; then
  echo "📦 Base de données vide détectée - Application des migrations..."
  npx prisma migrate deploy
  
  echo "🌱 Seed de la base de données..."
  node prisma/seed.js
  
  echo "👤 Création de l'utilisateur admin..."
  node scripts/create-admin.js
  
  echo "✅ Initialisation terminée !"
else
  echo "✅ Base de données déjà initialisée (${TABLE_COUNT} tables trouvées)"
fi

echo "🔐 Synchronisation des rôles et permissions système..."
npm run sync:roles

echo "🚀 Démarrage de l'application..."
exec npm start
