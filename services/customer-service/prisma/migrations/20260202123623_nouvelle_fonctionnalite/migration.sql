/*
  Warnings:

  - You are about to drop the column `adresse` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `typeClient` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `montant` on the `contrats` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reference]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[siret]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tvaIntra]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[prospectId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId,email]` on the table `contacts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reference]` on the table `contrats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reference` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeClientId` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montantHT` to the `contrats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montantTTC` to the `contrats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `contrats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeContrat` to the `contrats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrioriteClient" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutContact" AS ENUM ('ACTIF', 'INACTIF', 'PARTI');

-- CreateEnum
CREATE TYPE "TypeContact" AS ENUM ('COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('MAINTENANCE', 'SERVICE', 'PRODUIT', 'PARTENARIAT', 'ABONNEMENT', 'FORFAIT', 'CONSULTING', 'FORMATION', 'LICENCE', 'SAAS');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('CONTRAT', 'FACTURE', 'DEVIS', 'AVENANT', 'KYC', 'LEGAL', 'TECHNIQUE', 'COMMERCIAL', 'ADMINISTRATIF', 'FINANCIER', 'RAPPORT');

-- CreateEnum
CREATE TYPE "TypeInteraction" AS ENUM ('APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE', 'FORMATION', 'DEMONSTRATION', 'PRESENTATION', 'NEGOCIATION');

-- CreateEnum
CREATE TYPE "CanalInteraction" AS ENUM ('TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'RESEAUX_SOCIAUX', 'PORTAL_CLIENT', 'MOBILE');

-- CreateEnum
CREATE TYPE "StatutTache" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'REPORTEE');

-- CreateEnum
CREATE TYPE "PrioriteTache" AS ENUM ('BASSE', 'NORMALE', 'ELEVEE', 'URGENTE');

-- CreateEnum
CREATE TYPE "TypeAdresse" AS ENUM ('FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE');

-- CreateEnum
CREATE TYPE "SourceClient" AS ENUM ('PROSPECTION', 'RECOMMANDATION', 'PARTENAIRE', 'SALON', 'SITE_WEB', 'RESEAUX_SOCIAUX', 'CAMPAGNE_EMAIL', 'APPEL_ENTRANT', 'BASE_ACHETEE', 'AUTRE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatusClient" ADD VALUE 'SUSPENDU';
ALTER TYPE "StatusClient" ADD VALUE 'ARCHIVE';
ALTER TYPE "StatusClient" ADD VALUE 'LEAD_CHAUD';
ALTER TYPE "StatusClient" ADD VALUE 'LEAD_FROID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatusContrat" ADD VALUE 'EN_ATTENTE_SIGNATURE';
ALTER TYPE "StatusContrat" ADD VALUE 'RESILIE';
ALTER TYPE "StatusContrat" ADD VALUE 'EN_RENOUVELLEMENT';

-- DropIndex
DROP INDEX "contrats_numeroContrat_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "adresse",
DROP COLUMN "typeClient",
ADD COLUMN     "ape" TEXT,
ADD COLUMN     "chiffreAffaireAnnuel" DECIMAL(15,2),
ADD COLUMN     "commercialId" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dateCreationEntreprise" TIMESTAMP(3),
ADD COLUMN     "dateDerniereInteraction" TIMESTAMP(3),
ADD COLUMN     "dateDerniereVisite" TIMESTAMP(3),
ADD COLUMN     "dateDevenirClient" TIMESTAMP(3),
ADD COLUMN     "datePremierContact" TIMESTAMP(3),
ADD COLUMN     "effectif" INTEGER,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "noteInterne" INTEGER DEFAULT 3,
ADD COLUMN     "priorite" "PrioriteClient" NOT NULL DEFAULT 'MOYENNE',
ADD COLUMN     "prospectId" TEXT,
ADD COLUMN     "raisonSociale" TEXT,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "scoreFidelite" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreRisque" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "secteurActiviteId" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "siteWeb" TEXT,
ADD COLUMN     "source" "SourceClient",
ADD COLUMN     "tvaIntra" TEXT,
ADD COLUMN     "typeClientId" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "civilite" TEXT,
ADD COLUMN     "dateNaissance" TIMESTAMP(3),
ADD COLUMN     "departement" TEXT,
ADD COLUMN     "emailSecondaire" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preferencesContact" JSONB,
ADD COLUMN     "statut" "StatutContact" NOT NULL DEFAULT 'ACTIF',
ADD COLUMN     "type" "TypeContact" NOT NULL DEFAULT 'COMMERCIAL';

-- AlterTable
ALTER TABLE "contrats" DROP COLUMN "montant",
ADD COLUMN     "conditionsParticulieres" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dateEffet" TIMESTAMP(3),
ADD COLUMN     "dateProchainRenouvellement" TIMESTAMP(3),
ADD COLUMN     "dateSignature" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "devise" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "documentContratId" TEXT,
ADD COLUMN     "estRenouvelable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jourPaiement" INTEGER,
ADD COLUMN     "montantHT" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "montantTTC" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "motifResiliation" TEXT,
ADD COLUMN     "motifSuspension" TEXT,
ADD COLUMN     "periodeRenouvellement" TEXT,
ADD COLUMN     "periodicitePaiement" TEXT,
ADD COLUMN     "preavisRenouvellement" INTEGER,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "signataireId" TEXT,
ADD COLUMN     "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
ADD COLUMN     "typeContrat" "TypeContrat" NOT NULL,
ALTER COLUMN "numeroContrat" DROP NOT NULL;

-- DropEnum
DROP TYPE "TypeClient";

-- CreateTable
CREATE TABLE "type_clients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "couleur" TEXT DEFAULT '#3B82F6',
    "icone" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "type_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secteurs_activite" (
    "id" TEXT NOT NULL,
    "codeNAF" TEXT,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "niveau" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secteurs_activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresse_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "typeAdresse" "TypeAdresse" NOT NULL DEFAULT 'FACTURATION',
    "nomAdresse" TEXT,
    "ligne1" TEXT NOT NULL,
    "ligne2" TEXT,
    "ligne3" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "region" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'cote d\'ivoire',
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "coordonneesGps" TEXT,
    "informationsAcces" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adresse_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avenants_contrat" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "numeroAvenant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modifications" JSONB NOT NULL,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "dateSignature" TIMESTAMP(3),
    "montantAdditionnel" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "avenants_contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" "TypeInteraction" NOT NULL,
    "canal" "CanalInteraction" NOT NULL,
    "sujet" TEXT NOT NULL,
    "description" TEXT,
    "dateInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSuivie" TIMESTAMP(3),
    "dureeMinutes" INTEGER,
    "resultat" TEXT,
    "actionRequise" TEXT,
    "tacheLieeId" TEXT,
    "createdById" TEXT NOT NULL,
    "participants" TEXT[],
    "tags" TEXT[],
    "piecesJointes" TEXT[],
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interaction_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contratId" TEXT,
    "typeDocument" "TypeDocument" NOT NULL,
    "categorie" TEXT,
    "nomFichier" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "motsCles" TEXT[],
    "version" TEXT NOT NULL DEFAULT '1.0',
    "estValide" BOOLEAN NOT NULL DEFAULT true,
    "dateExpiration" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "dateUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),
    "signatureDigitale" TEXT,
    "confidential" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "typeNote" TEXT NOT NULL DEFAULT 'INTERNE',
    "estPrivee" BOOLEAN NOT NULL DEFAULT true,
    "priorite" "PrioriteTache" NOT NULL DEFAULT 'NORMALE',
    "createdById" TEXT NOT NULL,
    "tags" TEXT[],
    "rappelLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tache_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" "StatutTache" NOT NULL DEFAULT 'A_FAIRE',
    "priorite" "PrioriteTache" NOT NULL DEFAULT 'NORMALE',
    "categorie" TEXT,
    "dateEcheance" TIMESTAMP(3),
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "assigneA" TEXT,
    "createurId" TEXT NOT NULL,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "estRecurrente" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "parentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tache_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunites" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "montantEstime" DECIMAL(12,2) NOT NULL,
    "probabilite" INTEGER NOT NULL DEFAULT 50,
    "dateFermetureEstimee" TIMESTAMP(3),
    "etape" TEXT NOT NULL DEFAULT 'PROSPECTION',
    "statut" TEXT NOT NULL DEFAULT 'OUVERTE',
    "raisonPerdue" TEXT,
    "createdById" TEXT NOT NULL,
    "commercialId" TEXT,
    "source" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_produit" (
    "id" TEXT NOT NULL,
    "opportuniteId" TEXT NOT NULL,
    "produitId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "remise" DECIMAL(5,2),
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contratId" TEXT,
    "numeroFacture" TEXT NOT NULL,
    "typeFacture" TEXT NOT NULL DEFAULT 'STANDARD',
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3),
    "datePaiement" TIMESTAMP(3),
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTVA" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,
    "montantPaye" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "solde" DECIMAL(12,2) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EMISE',
    "modePaiement" TEXT,
    "referencePaiement" TEXT,
    "notes" TEXT,
    "conditionsPaiement" TEXT,
    "penalitesRetard" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_facture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "remise" DECIMAL(5,2),
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTVA" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "lignes_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "fuseauHoraire" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "formatDate" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "accepteMarketing" BOOLEAN NOT NULL DEFAULT false,
    "accepteNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "modeCommunicationPrefere" TEXT,
    "horairesContact" JSONB,
    "rgpdAccepteLe" TIMESTAMP(3),
    "rgpdMiseAJourLe" TIMESTAMP(3),
    "donneesSupprimeesLe" TIMESTAMP(3),
    "categoriesDonneesConsenties" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "categorie" TEXT,
    "couleur" TEXT,

    CONSTRAINT "tag_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnement_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nomService" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "periodicite" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "dateProchainPaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnement_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "typeChangement" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "ancienneValeur" JSONB,
    "nouvelleValeur" JSONB,
    "differences" JSONB,
    "modifieParId" TEXT NOT NULL,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "historique_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_prospect_client" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "typeSync" TEXT NOT NULL DEFAULT 'PROSPECT_TO_CLIENT',
    "dateSynchronisation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUCCES',
    "erreur" TEXT,
    "details" JSONB,
    "tentatives" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_prospect_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_status" (
    "id" TEXT NOT NULL,
    "serviceSource" TEXT NOT NULL,
    "statusSource" TEXT NOT NULL,
    "serviceCible" TEXT NOT NULL,
    "statusCible" TEXT NOT NULL,
    "priorite" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mapping_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "type_clients_code_key" ON "type_clients"("code");

-- CreateIndex
CREATE INDEX "type_clients_code_idx" ON "type_clients"("code");

-- CreateIndex
CREATE INDEX "type_clients_isActive_idx" ON "type_clients"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "secteurs_activite_codeNAF_key" ON "secteurs_activite"("codeNAF");

-- CreateIndex
CREATE INDEX "secteurs_activite_parentId_idx" ON "secteurs_activite"("parentId");

-- CreateIndex
CREATE INDEX "secteurs_activite_codeNAF_idx" ON "secteurs_activite"("codeNAF");

-- CreateIndex
CREATE INDEX "adresse_clients_clientId_idx" ON "adresse_clients"("clientId");

-- CreateIndex
CREATE INDEX "adresse_clients_typeAdresse_idx" ON "adresse_clients"("typeAdresse");

-- CreateIndex
CREATE INDEX "adresse_clients_isPrincipal_idx" ON "adresse_clients"("isPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "adresse_clients_clientId_typeAdresse_key" ON "adresse_clients"("clientId", "typeAdresse");

-- CreateIndex
CREATE INDEX "avenants_contrat_contratId_idx" ON "avenants_contrat"("contratId");

-- CreateIndex
CREATE UNIQUE INDEX "avenants_contrat_contratId_numeroAvenant_key" ON "avenants_contrat"("contratId", "numeroAvenant");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_clients_tacheLieeId_key" ON "interaction_clients"("tacheLieeId");

-- CreateIndex
CREATE INDEX "interaction_clients_clientId_idx" ON "interaction_clients"("clientId");

-- CreateIndex
CREATE INDEX "interaction_clients_contactId_idx" ON "interaction_clients"("contactId");

-- CreateIndex
CREATE INDEX "interaction_clients_dateInteraction_idx" ON "interaction_clients"("dateInteraction");

-- CreateIndex
CREATE INDEX "interaction_clients_type_idx" ON "interaction_clients"("type");

-- CreateIndex
CREATE INDEX "interaction_clients_createdById_idx" ON "interaction_clients"("createdById");

-- CreateIndex
CREATE INDEX "document_clients_clientId_idx" ON "document_clients"("clientId");

-- CreateIndex
CREATE INDEX "document_clients_contratId_idx" ON "document_clients"("contratId");

-- CreateIndex
CREATE INDEX "document_clients_typeDocument_idx" ON "document_clients"("typeDocument");

-- CreateIndex
CREATE INDEX "document_clients_dateUpload_idx" ON "document_clients"("dateUpload");

-- CreateIndex
CREATE INDEX "document_clients_estValide_idx" ON "document_clients"("estValide");

-- CreateIndex
CREATE INDEX "note_clients_clientId_idx" ON "note_clients"("clientId");

-- CreateIndex
CREATE INDEX "note_clients_contactId_idx" ON "note_clients"("contactId");

-- CreateIndex
CREATE INDEX "note_clients_createdAt_idx" ON "note_clients"("createdAt");

-- CreateIndex
CREATE INDEX "note_clients_estPrivee_idx" ON "note_clients"("estPrivee");

-- CreateIndex
CREATE INDEX "note_clients_rappelLe_idx" ON "note_clients"("rappelLe");

-- CreateIndex
CREATE INDEX "tache_clients_clientId_idx" ON "tache_clients"("clientId");

-- CreateIndex
CREATE INDEX "tache_clients_contactId_idx" ON "tache_clients"("contactId");

-- CreateIndex
CREATE INDEX "tache_clients_statut_idx" ON "tache_clients"("statut");

-- CreateIndex
CREATE INDEX "tache_clients_priorite_idx" ON "tache_clients"("priorite");

-- CreateIndex
CREATE INDEX "tache_clients_dateEcheance_idx" ON "tache_clients"("dateEcheance");

-- CreateIndex
CREATE INDEX "tache_clients_assigneA_idx" ON "tache_clients"("assigneA");

-- CreateIndex
CREATE INDEX "opportunites_clientId_idx" ON "opportunites"("clientId");

-- CreateIndex
CREATE INDEX "opportunites_etape_idx" ON "opportunites"("etape");

-- CreateIndex
CREATE INDEX "opportunites_statut_idx" ON "opportunites"("statut");

-- CreateIndex
CREATE INDEX "opportunites_dateFermetureEstimee_idx" ON "opportunites"("dateFermetureEstimee");

-- CreateIndex
CREATE INDEX "opportunites_commercialId_idx" ON "opportunites"("commercialId");

-- CreateIndex
CREATE INDEX "lignes_produit_opportuniteId_idx" ON "lignes_produit"("opportuniteId");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numeroFacture_key" ON "factures"("numeroFacture");

-- CreateIndex
CREATE INDEX "factures_clientId_idx" ON "factures"("clientId");

-- CreateIndex
CREATE INDEX "factures_contratId_idx" ON "factures"("contratId");

-- CreateIndex
CREATE INDEX "factures_dateEmission_idx" ON "factures"("dateEmission");

-- CreateIndex
CREATE INDEX "factures_statut_idx" ON "factures"("statut");

-- CreateIndex
CREATE INDEX "factures_dateEcheance_idx" ON "factures"("dateEcheance");

-- CreateIndex
CREATE INDEX "lignes_facture_factureId_idx" ON "lignes_facture"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_clients_clientId_key" ON "preferences_clients"("clientId");

-- CreateIndex
CREATE INDEX "tag_clients_clientId_idx" ON "tag_clients"("clientId");

-- CreateIndex
CREATE INDEX "tag_clients_tag_idx" ON "tag_clients"("tag");

-- CreateIndex
CREATE INDEX "tag_clients_categorie_idx" ON "tag_clients"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "tag_clients_clientId_tag_key" ON "tag_clients"("clientId", "tag");

-- CreateIndex
CREATE INDEX "abonnement_clients_clientId_idx" ON "abonnement_clients"("clientId");

-- CreateIndex
CREATE INDEX "abonnement_clients_statut_idx" ON "abonnement_clients"("statut");

-- CreateIndex
CREATE INDEX "abonnement_clients_dateProchainPaiement_idx" ON "abonnement_clients"("dateProchainPaiement");

-- CreateIndex
CREATE INDEX "historique_clients_clientId_idx" ON "historique_clients"("clientId");

-- CreateIndex
CREATE INDEX "historique_clients_modifieLe_idx" ON "historique_clients"("modifieLe");

-- CreateIndex
CREATE INDEX "historique_clients_entite_entiteId_idx" ON "historique_clients"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "sync_prospect_client_dateSynchronisation_idx" ON "sync_prospect_client"("dateSynchronisation");

-- CreateIndex
CREATE INDEX "sync_prospect_client_status_idx" ON "sync_prospect_client"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_prospect_client_prospectId_clientId_key" ON "sync_prospect_client"("prospectId", "clientId");

-- CreateIndex
CREATE INDEX "mapping_status_serviceSource_serviceCible_idx" ON "mapping_status"("serviceSource", "serviceCible");

-- CreateIndex
CREATE UNIQUE INDEX "mapping_status_serviceSource_statusSource_serviceCible_key" ON "mapping_status"("serviceSource", "statusSource", "serviceCible");

-- CreateIndex
CREATE UNIQUE INDEX "clients_reference_key" ON "clients"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "clients_siret_key" ON "clients"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tvaIntra_key" ON "clients"("tvaIntra");

-- CreateIndex
CREATE UNIQUE INDEX "clients_prospectId_key" ON "clients"("prospectId");

-- CreateIndex
CREATE INDEX "clients_typeClientId_idx" ON "clients"("typeClientId");

-- CreateIndex
CREATE INDEX "clients_secteurActiviteId_idx" ON "clients"("secteurActiviteId");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_priorite_idx" ON "clients"("priorite");

-- CreateIndex
CREATE INDEX "clients_commercialId_idx" ON "clients"("commercialId");

-- CreateIndex
CREATE INDEX "clients_createdAt_idx" ON "clients"("createdAt");

-- CreateIndex
CREATE INDEX "clients_updatedAt_idx" ON "clients"("updatedAt");

-- CreateIndex
CREATE INDEX "clients_reference_idx" ON "clients"("reference");

-- CreateIndex
CREATE INDEX "contacts_clientId_idx" ON "contacts"("clientId");

-- CreateIndex
CREATE INDEX "contacts_principal_idx" ON "contacts"("principal");

-- CreateIndex
CREATE INDEX "contacts_type_idx" ON "contacts"("type");

-- CreateIndex
CREATE INDEX "contacts_statut_idx" ON "contacts"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_clientId_email_key" ON "contacts"("clientId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contrats_reference_key" ON "contrats"("reference");

-- CreateIndex
CREATE INDEX "contrats_clientId_idx" ON "contrats"("clientId");

-- CreateIndex
CREATE INDEX "contrats_status_idx" ON "contrats"("status");

-- CreateIndex
CREATE INDEX "contrats_dateFin_idx" ON "contrats"("dateFin");

-- CreateIndex
CREATE INDEX "contrats_typeContrat_idx" ON "contrats"("typeContrat");

-- CreateIndex
CREATE INDEX "contrats_dateProchainRenouvellement_idx" ON "contrats"("dateProchainRenouvellement");

-- AddForeignKey
ALTER TABLE "secteurs_activite" ADD CONSTRAINT "secteurs_activite_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "secteurs_activite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_typeClientId_fkey" FOREIGN KEY ("typeClientId") REFERENCES "type_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_secteurActiviteId_fkey" FOREIGN KEY ("secteurActiviteId") REFERENCES "secteurs_activite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adresse_clients" ADD CONSTRAINT "adresse_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avenants_contrat" ADD CONSTRAINT "avenants_contrat_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_clients" ADD CONSTRAINT "interaction_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_clients" ADD CONSTRAINT "interaction_clients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_clients" ADD CONSTRAINT "interaction_clients_tacheLieeId_fkey" FOREIGN KEY ("tacheLieeId") REFERENCES "tache_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_clients" ADD CONSTRAINT "document_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_clients" ADD CONSTRAINT "document_clients_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_clients" ADD CONSTRAINT "note_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_clients" ADD CONSTRAINT "note_clients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache_clients" ADD CONSTRAINT "tache_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache_clients" ADD CONSTRAINT "tache_clients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunites" ADD CONSTRAINT "opportunites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_produit" ADD CONSTRAINT "lignes_produit_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "opportunites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "contrats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_facture" ADD CONSTRAINT "lignes_facture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferences_clients" ADD CONSTRAINT "preferences_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_clients" ADD CONSTRAINT "tag_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement_clients" ADD CONSTRAINT "abonnement_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_clients" ADD CONSTRAINT "historique_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_prospect_client" ADD CONSTRAINT "sync_prospect_client_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
