#!/bin/sh
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

# Regenerer le client Prisma si le build n'a pas deja constate que le CDN est indisponible.
if [ -f "/app/.prisma-generate-failed" ]; then
  echo "⚠️ Prisma generate indisponible au build; passage direct au fallback si necessaire"
else
  echo "🔄 Régénérant le client Prisma..."
  if npx prisma generate --schema=prisma/schema.prisma; then
    echo "✅ Prisma client régénéré avec succès"
  else
    echo "⚠️ Prisma generate échoué, continuant..."
  fi
fi

# Verifier si le client Prisma est réellement initialisé. Le fichier index.js
# peut exister meme quand le client n'a jamais ete genere.
if node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient();" >/dev/null 2>&1; then
  DB_FALLBACK_MODE=false
else
  echo "⚠️ Client Prisma non initialisé, utilisation du mode SQL de secours"
  DB_FALLBACK_MODE=true
fi

# Vérifier si les tables existent uniquement si Prisma fonctionne
if [ "$DB_FALLBACK_MODE" = "false" ]; then
  echo "🔍 Vérification de l'état de la base de données..."
  TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "0")

  if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "📦 Base de données vide détectée - Application des migrations..."
    if npx prisma migrate deploy; then
      echo "✅ Prisma migrations applied."
    else
      echo "⚠️ Prisma migrate deploy failed, retrying SQL fallback bootstrap..."
      npx prisma generate --schema=prisma/schema.prisma || echo "⚠️ Prisma generate fallback failed, continuing..."
      node scripts/bootstrap-auth-fallback.js || echo "⚠️ SQL fallback bootstrap failed, continuing startup..."
    fi
    
    echo "🌱 Seed de la base de données..."
    node prisma/seed.js || echo "⚠️ Seed step failed, continuing startup..."
    
    echo "👤 Création de l'utilisateur admin..."
    node scripts/create-admin.js || echo "⚠️ Admin creation step failed, continuing startup..."
    
    echo "✅ Initialisation terminée !"
  else
    echo "✅ Base de données déjà initialisée (${TABLE_COUNT} tables trouvées)"
  fi
  
  echo "🔐 Synchronisation des rôles et permissions système..."
  npm run sync:roles || echo "⚠️ Role synchronization failed, continuing startup..."
else
  echo "⏭️  Initialisation SQL de secours pour auth-service"
  node scripts/bootstrap-auth-fallback.js
fi

echo "🚀 Démarrage de l'application..."
exec npm start
