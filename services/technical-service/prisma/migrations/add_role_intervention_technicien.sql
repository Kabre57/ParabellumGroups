-- Migration: Ajout du champ role à la table interventions_techniciens
-- Exécuter avec: psql $DATABASE_URL -f prisma/migrations/add_role_intervention_technicien.sql

ALTER TABLE interventions_techniciens 
ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Assistant';
