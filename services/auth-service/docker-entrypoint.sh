#!/bin/bash
set -e

echo "🚀 Démarrage du auth-service..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de la base de données..."
until pg_isready -h postgres -p 5432 -U parabellum; do
  echo "PostgreSQL n'est pas encore prêt - attente..."
  sleep 2
done

echo "✅ PostgreSQL est prêt !"

# Vérifier si les tables existent
echo "🔍 Vérification de l'état de la base de données..."
TABLE_COUNT=$(PGPASSWORD=parabellum2025 psql -h postgres -U parabellum -d parabellum_auth -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "0")

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

echo "🚀 Démarrage de l'application..."
exec npm start
