-- ============================================================
-- SCRIPT DE MIGRATION CRM - Phase 1 : Nouvelles tables
-- À exécuter APRÈS un backup complet de la base de données
-- Commande backup : pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
-- ============================================================

-- 1. Ajout de la classification OHADA/métier dans StatusClient
-- (Ajouter ADHERENT, PARTICIPANT, RETRAITE, PARTENAIRE à l'enum existant)
-- NOTE: PostgreSQL requiert une migration Prisma pour modifier les enums

-- 2. Table des consentements RGPD (granulaire par canal/finalité)
CREATE TABLE IF NOT EXISTS "consentements_client" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "canal" TEXT NOT NULL,          -- 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEPHONE' | 'COURRIER' | 'PUSH'
    "finalite" TEXT NOT NULL,       -- 'MARKETING' | 'NEWSLETTER' | 'RELANCE' | 'SONDAGE' | 'STATISTIQUES'
    "consenti" BOOLEAN NOT NULL DEFAULT false,
    "dateConsent" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "dateRevocation" TIMESTAMP WITH TIME ZONE,
    "sourceConsent" TEXT,           -- 'FORMULAIRE' | 'VERBAL' | 'EMAIL' | 'PORTAIL' | 'IMPORT'
    "sourceUrl" TEXT,
    "ipAddress" TEXT,
    "preuveConsentement" TEXT,      -- URL du document ou hash
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_consent_client" ON "consentements_client"("clientId");
CREATE INDEX IF NOT EXISTS "idx_consent_canal" ON "consentements_client"("canal");
CREATE INDEX IF NOT EXISTS "idx_consent_finalite" ON "consentements_client"("finalite");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_consent_unique" ON "consentements_client"("clientId", "canal", "finalite");

-- 3. Table des segments clients (segmentation dynamique multicritères)
CREATE TABLE IF NOT EXISTS "segments_clients" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "couleur" TEXT DEFAULT '#3B82F6',
    "criteres" JSONB NOT NULL DEFAULT '{}',  -- JSON des critères de filtrage
    "typeSegment" TEXT NOT NULL DEFAULT 'DYNAMIQUE',  -- 'DYNAMIQUE' | 'STATIQUE' | 'HYBRIDE'
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,  -- Segments créés automatiquement
    "compte" INTEGER NOT NULL DEFAULT 0,        -- Nombre de clients (mis à jour par cron)
    "dernierCalcul" TIMESTAMP WITH TIME ZONE,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_segment_active" ON "segments_clients"("isActive");
CREATE INDEX IF NOT EXISTS "idx_segment_type" ON "segments_clients"("typeSegment");

-- 4. Table de liaison segment-client (pour segments statiques/hybrides)
CREATE TABLE IF NOT EXISTS "segment_clients_membres" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "segmentId" TEXT NOT NULL REFERENCES "segments_clients"("id") ON DELETE CASCADE,
    "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "ajouteLe" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "ajouteById" TEXT,
    "source" TEXT DEFAULT 'MANUEL',  -- 'MANUEL' | 'AUTOMATIQUE' | 'IMPORT'
    "exclure" BOOLEAN NOT NULL DEFAULT false  -- Pour exclure explicitement du dynamique
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_segment_membre_unique" ON "segment_clients_membres"("segmentId", "clientId");
CREATE INDEX IF NOT EXISTS "idx_segment_membre_client" ON "segment_clients_membres"("clientId");

-- 5. Table des tickets/réclamations
CREATE TABLE IF NOT EXISTS "tickets_crm" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "reference" TEXT UNIQUE,            -- TKT-2026-0001
    "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "contactId" TEXT REFERENCES "contacts"("id"),
    "sujet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" TEXT,                   -- 'RECLAMATION' | 'DEMANDE' | 'INFORMATION' | 'INCIDENT' | 'SUGGESTION'
    "canal" TEXT NOT NULL DEFAULT 'EMAIL',  -- 'EMAIL' | 'TELEPHONE' | 'PORTAIL' | 'COURRIER' | 'WHATSAPP'
    "statut" TEXT NOT NULL DEFAULT 'NOUVEAU',  -- 'NOUVEAU' | 'EN_COURS' | 'EN_ATTENTE' | 'RESOLU' | 'FERME'
    "priorite" TEXT NOT NULL DEFAULT 'NORMALE',  -- 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE'
    "assigneA" TEXT,                    -- ID utilisateur assigné
    "serviceId" TEXT,                   -- Service responsable
    "slaDeadline" TIMESTAMP WITH TIME ZONE,  -- Délai contractuel de résolution
    "premierTraitementLe" TIMESTAMP WITH TIME ZONE,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "closedAt" TIMESTAMP WITH TIME ZONE,
    "satisfactionScore" INTEGER,        -- 1-5 après résolution
    "satisfactionComment" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ticket_client" ON "tickets_crm"("clientId");
CREATE INDEX IF NOT EXISTS "idx_ticket_statut" ON "tickets_crm"("statut");
CREATE INDEX IF NOT EXISTS "idx_ticket_priorite" ON "tickets_crm"("priorite");
CREATE INDEX IF NOT EXISTS "idx_ticket_assigne" ON "tickets_crm"("assigneA");
CREATE INDEX IF NOT EXISTS "idx_ticket_sla" ON "tickets_crm"("slaDeadline");
CREATE INDEX IF NOT EXISTS "idx_ticket_created" ON "tickets_crm"("createdAt");

-- 6. Table de l'historique des tickets
CREATE TABLE IF NOT EXISTS "tickets_historique" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL REFERENCES "tickets_crm"("id") ON DELETE CASCADE,
    "typeEvenement" TEXT NOT NULL,   -- 'STATUT' | 'ASSIGNATION' | 'COMMENTAIRE' | 'PRIORITE'
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "commentaire" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,  -- Visible par le client ou interne
    "auteurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ticket_historique_ticket" ON "tickets_historique"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_ticket_historique_created" ON "tickets_historique"("createdAt");

-- 7. Table des sondages de satisfaction
CREATE TABLE IF NOT EXISTS "sondages_satisfaction" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "typeSondage" TEXT NOT NULL DEFAULT 'NPS',  -- 'NPS' | 'CSAT' | 'CES' | 'PERSONNALISE'
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',  -- 'BROUILLON' | 'ACTIF' | 'PAUSE' | 'FERME'
    "declencheur" TEXT DEFAULT 'MANUEL',         -- 'MANUEL' | 'POST_TICKET' | 'POST_INTERACTION' | 'PERIODIQUE' | 'CAMPAGNE'
    "delaiEnvoiJours" INTEGER DEFAULT 1,         -- Délai après l'événement déclencheur
    "questions" JSONB NOT NULL DEFAULT '[]',     -- Array des questions (type, texte, options)
    "segmentId" TEXT REFERENCES "segments_clients"("id"),  -- Ciblage par segment
    "dateDebut" TIMESTAMP WITH TIME ZONE,
    "dateFin" TIMESTAMP WITH TIME ZONE,
    "nombreEnvois" INTEGER NOT NULL DEFAULT 0,
    "nombreReponses" INTEGER NOT NULL DEFAULT 0,
    "scoreNPS" FLOAT,
    "scoreMoyen" FLOAT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Table des réponses aux sondages
CREATE TABLE IF NOT EXISTS "reponses_sondage" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sondageId" TEXT NOT NULL REFERENCES "sondages_satisfaction"("id") ON DELETE CASCADE,
    "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "contactId" TEXT REFERENCES "contacts"("id"),
    "ticketId" TEXT REFERENCES "tickets_crm"("id"),
    "reponses" JSONB NOT NULL DEFAULT '{}',  -- Réponses par question
    "scoreGlobal" FLOAT,
    "scoreNPS" INTEGER,           -- -100 à 100 (Promoteur=9-10, Passif=7-8, Détracteur=0-6)
    "categorieNPS" TEXT,          -- 'PROMOTEUR' | 'PASSIF' | 'DETRACTEUR'
    "commentaire" TEXT,
    "tokenAcces" TEXT UNIQUE,     -- Token pour accès anonyme au formulaire
    "envoiLe" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "reponseLe" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_reponse_sondage" ON "reponses_sondage"("sondageId");
CREATE INDEX IF NOT EXISTS "idx_reponse_client" ON "reponses_sondage"("clientId");

-- 9. Table des relances automatiques programmables
CREATE TABLE IF NOT EXISTS "relances_automatiques" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "declencheur" TEXT NOT NULL,      -- 'TICKET_OUVERT' | 'ECHEANCE_CONTRAT' | 'SANS_INTERACTION' | 'SONDAGE_NON_REPONDU' | 'COTISATION'
    "delaiJours" INTEGER NOT NULL DEFAULT 7,  -- Délai avant envoi
    "canal" TEXT NOT NULL DEFAULT 'EMAIL',    -- 'EMAIL' | 'SMS' | 'WHATSAPP'
    "templateId" TEXT,                -- Référence au template
    "sujetTemplate" TEXT,
    "corpsTemplate" TEXT,             -- Peut contenir des variables {{nom}}, {{echeance}}, etc.
    "segmentId" TEXT REFERENCES "segments_clients"("id"),
    "conditions" JSONB DEFAULT '{}',  -- Conditions supplémentaires
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "heureEnvoi" TEXT DEFAULT '09:00',  -- HH:MM heure d'envoi
    "joursEnvoi" TEXT[] DEFAULT ARRAY['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI']::TEXT[],
    "nombreExecutions" INTEGER NOT NULL DEFAULT 0,
    "dernierExecutionLe" TIMESTAMP WITH TIME ZONE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Table de L'historique des exécutions de relances
CREATE TABLE IF NOT EXISTS "relances_executions" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "relanceId" TEXT NOT NULL REFERENCES "relances_automatiques"("id") ON DELETE CASCADE,
    "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "canal" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ENVOYE',  -- 'ENVOYE' | 'ECHEC' | 'ANNULE' | 'OUVERT' | 'REPONDU'
    "messageId" TEXT,               -- ID externe (email provider, SMS gateway)
    "ouvertLe" TIMESTAMP WITH TIME ZONE,
    "reponseLe" TIMESTAMP WITH TIME ZONE,
    "erreur" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_relance_exec_relance" ON "relances_executions"("relanceId");
CREATE INDEX IF NOT EXISTS "idx_relance_exec_client" ON "relances_executions"("clientId");

-- 11. Ajouter les nouveaux champs sur la table clients existante
-- (À adapter selon la migration Prisma - ces ALTER TABLE sont en complément)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "classificationMetier" TEXT;
-- Valeurs possibles : 'ADHERENT' | 'PARTICIPANT' | 'RETRAITE' | 'PARTENAIRE' | 'PROSPECT_CLIENT' | 'PROSPECT_FROID' | 'AUTRE'

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "dateNaissance" DATE;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "nif" TEXT UNIQUE;  -- Numéro d'Identification Fiscale normalisé
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "zoneGeographique" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "codeRegion" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "doNotContact" BOOLEAN DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "doNotContactRaison" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "languePreferee" TEXT DEFAULT 'fr';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "scoreEngagement" INTEGER DEFAULT 50;  -- 0-100

-- Indexation des nouveaux champs
CREATE INDEX IF NOT EXISTS "idx_client_classification" ON "clients"("classificationMetier");
CREATE INDEX IF NOT EXISTS "idx_client_zone" ON "clients"("zoneGeographique");
CREATE INDEX IF NOT EXISTS "idx_client_do_not_contact" ON "clients"("doNotContact");

-- ============================================================
-- FIN DU SCRIPT - Vérifier avec: \dt pour lister les tables
-- ============================================================
