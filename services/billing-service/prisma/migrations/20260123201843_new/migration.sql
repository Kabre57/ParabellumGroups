-- CreateEnum
CREATE TYPE "FactureStatus" AS ENUM ('BROUILLON', 'EMISE', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "DevisStatus" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('VIREMENT', 'CHEQUE', 'CARTE', 'ESPECES');

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "numeroFacture" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "status" "FactureStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_facture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "tauxTVA" DOUBLE PRECISION NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methodePaiement" "MethodePaiement" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis" (
    "id" TEXT NOT NULL,
    "numeroDevis" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" TIMESTAMP(3) NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "status" "DevisStatus" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_devis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "tauxTVA" DOUBLE PRECISION NOT NULL,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_devis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factures_numeroFacture_key" ON "factures"("numeroFacture");

-- CreateIndex
CREATE INDEX "factures_clientId_idx" ON "factures"("clientId");

-- CreateIndex
CREATE INDEX "factures_status_idx" ON "factures"("status");

-- CreateIndex
CREATE INDEX "factures_dateEmission_idx" ON "factures"("dateEmission");

-- CreateIndex
CREATE INDEX "lignes_facture_factureId_idx" ON "lignes_facture"("factureId");

-- CreateIndex
CREATE INDEX "paiements_factureId_idx" ON "paiements"("factureId");

-- CreateIndex
CREATE INDEX "paiements_datePaiement_idx" ON "paiements"("datePaiement");

-- CreateIndex
CREATE UNIQUE INDEX "devis_numeroDevis_key" ON "devis"("numeroDevis");

-- CreateIndex
CREATE INDEX "devis_clientId_idx" ON "devis"("clientId");

-- CreateIndex
CREATE INDEX "devis_status_idx" ON "devis"("status");

-- CreateIndex
CREATE INDEX "devis_dateEmission_idx" ON "devis"("dateEmission");

-- CreateIndex
CREATE INDEX "lignes_devis_devisId_idx" ON "lignes_devis"("devisId");

-- AddForeignKey
ALTER TABLE "lignes_facture" ADD CONSTRAINT "lignes_facture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis" ADD CONSTRAINT "lignes_devis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
