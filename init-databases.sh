#!/bin/sh
set -e

PGUSER="${POSTGRES_USER:-postgres}"
DBS_RAW="${POSTGRES_MULTIPLE_DATABASES:-}"
INVENTORY_DB="parabellum_inventory"

echo ">>> Initializing PostgreSQL databases..."
if [ -n "$DBS_RAW" ]; then
  # Support comma-separated values with optional spaces/newlines.
  echo "$DBS_RAW" | tr ',\n' '  ' | tr -s ' ' '\n' | while read -r DB; do
    if [ -z "$DB" ]; then
      continue
    fi
    echo ">>> Ensuring database $DB exists..."
    if ! psql -v ON_ERROR_STOP=1 --username="$PGUSER" --dbname="postgres" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
      psql -v ON_ERROR_STOP=1 --username="$PGUSER" --dbname="postgres" -c "CREATE DATABASE \"$DB\";"
    fi
  done
else
  echo ">>> POSTGRES_MULTIPLE_DATABASES is empty, skipping creation."
fi

# Optional seed for inventory, guarded by table existence.
echo ">>> Checking if table Article exists in $INVENTORY_DB..."
if [ "$(psql -v ON_ERROR_STOP=1 --username="$PGUSER" --dbname="$INVENTORY_DB" -tAc "SELECT to_regclass('public.\"Article\"') IS NOT NULL;" 2>/dev/null || echo "f")" != "t" ]; then
  echo ">>> Table Article not found yet, skipping inventory seed."
  exit 0
fi

echo ">>> Seeding inventory articles..."
psql -v ON_ERROR_STOP=1 --username="$PGUSER" --dbname="$INVENTORY_DB" <<'SQL'
INSERT INTO "Article" (id, reference, nom, description, categorie, unite, prixAchat, prixVente, quantiteStock, seuilAlerte, seuilRupture, emplacement, fournisseurId, status, createdAt, updatedAt)
VALUES
  ('00000000-0000-0000-0000-000000000001','ART-001','Clavier','Clavier mécanique','Informatique','PIECE',15000,20000,50,10,5,'A1',NULL,'ACTIF',NOW(),NOW()),
  ('00000000-0000-0000-0000-000000000002','ART-002','Souris','Souris sans fil','Informatique','PIECE',8000,12000,80,15,10,'A1',NULL,'ACTIF',NOW(),NOW()),
  ('00000000-0000-0000-0000-000000000003','ART-003','Écran 24\"','Moniteur full HD','Informatique','PIECE',60000,85000,20,5,2,'A2',NULL,'ACTIF',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;
SQL

echo ">>> Database init script completed."
