#!/bin/bash
set -e

echo "Démarrage de l'initialisation des bases de données..."

# Attendre que PostgreSQL soit prêt
until psql -U "$POSTGRES_USER" -c '\q'; do
  echo "En attente de PostgreSQL..."
  sleep 1
done

# Fonction pour créer une base de données
create_database() {
    local database=$1
    echo "Création de la base de données '$database'..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO "$POSTGRES_USER";
EOSQL
}

# Liste des bases de données à créer
databases=(
    parabellum_auth
    parabellum_communication
    parabellum_technical
    parabellum_commercial
    parabellum_inventory
    parabellum_projects
    parabellum_procurement
    parabellum_customers
    parabellum_hr
    parabellum_billing
    parabellum_Analytics
    delices_db
)

# Crée chaque base de données
for db in "${databases[@]}"; do
    create_database $db
done

echo "✓ Toutes les bases de données ont été créées avec succès !"