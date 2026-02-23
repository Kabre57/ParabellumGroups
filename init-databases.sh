#!/bin/sh
set -e

DB="parabellum_inventory"
PSQL="psql -v ON_ERROR_STOP=1 --username \"${POSTGRES_USER:-postgres}\" --dbname \"$DB\""

echo ">>> Seeding inventory articles..."
$PSQL <<'SQL'
INSERT INTO "Article" (id, reference, nom, description, categorie, unite, prixAchat, prixVente, quantiteStock, seuilAlerte, seuilRupture, emplacement, fournisseurId, status, createdAt, updatedAt)
VALUES
  ('00000000-0000-0000-0000-000000000001','ART-001','Clavier','Clavier mécanique','Informatique','PIECE',15000,20000,50,10,5,'A1',NULL,'ACTIF',NOW(),NOW()),
  ('00000000-0000-0000-0000-000000000002','ART-002','Souris','Souris sans fil','Informatique','PIECE',8000,12000,80,15,10,'A1',NULL,'ACTIF',NOW(),NOW()),
  ('00000000-0000-0000-0000-000000000003','ART-003','Écran 24\"','Moniteur full HD','Informatique','PIECE',60000,85000,20,5,2,'A2',NULL,'ACTIF',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;
SQL

echo ">>> Seed finished."
