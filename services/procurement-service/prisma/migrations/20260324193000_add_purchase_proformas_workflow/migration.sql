ALTER TYPE "StatusDemandeAchat" ADD VALUE IF NOT EXISTS 'PROFORMAS_EN_COURS';
ALTER TYPE "StatusDemandeAchat" ADD VALUE IF NOT EXISTS 'PROFORMA_SOUMISE';
ALTER TYPE "StatusDemandeAchat" ADD VALUE IF NOT EXISTS 'PROFORMA_APPROUVEE';

CREATE TYPE "StatusProforma" AS ENUM ('BROUILLON', 'SOUMISE', 'APPROUVEE', 'REJETEE');

CREATE TABLE "proformas" (
    "id" TEXT NOT NULL,
    "numeroProforma" TEXT NOT NULL,
    "demandeAchatId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "titre" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "montantHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusProforma" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByServiceId" INTEGER,
    "approvedByServiceName" TEXT,
    "rejectionReason" TEXT,
    "selectedForOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proformas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lignes_proforma" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "articleId" TEXT,
    "referenceArticle" TEXT,
    "designation" TEXT NOT NULL,
    "categorie" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_proforma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proforma_approval_logs" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "StatusProforma" NOT NULL,
    "toStatus" "StatusProforma" NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorServiceId" INTEGER,
    "actorServiceName" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proforma_approval_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bons_commande"
ADD COLUMN "proformaId" TEXT;

CREATE UNIQUE INDEX "proformas_numeroProforma_key" ON "proformas"("numeroProforma");
CREATE INDEX "proformas_demandeAchatId_idx" ON "proformas"("demandeAchatId");
CREATE INDEX "proformas_fournisseurId_idx" ON "proformas"("fournisseurId");
CREATE INDEX "lignes_proforma_proformaId_idx" ON "lignes_proforma"("proformaId");
CREATE INDEX "proforma_approval_logs_proformaId_idx" ON "proforma_approval_logs"("proformaId");
CREATE UNIQUE INDEX "bons_commande_proformaId_key" ON "bons_commande"("proformaId");

ALTER TABLE "proformas"
ADD CONSTRAINT "proformas_demandeAchatId_fkey"
FOREIGN KEY ("demandeAchatId") REFERENCES "demandes_achat"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proformas"
ADD CONSTRAINT "proformas_fournisseurId_fkey"
FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lignes_proforma"
ADD CONSTRAINT "lignes_proforma_proformaId_fkey"
FOREIGN KEY ("proformaId") REFERENCES "proformas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proforma_approval_logs"
ADD CONSTRAINT "proforma_approval_logs_proformaId_fkey"
FOREIGN KEY ("proformaId") REFERENCES "proformas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bons_commande"
ADD CONSTRAINT "bons_commande_proformaId_fkey"
FOREIGN KEY ("proformaId") REFERENCES "proformas"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
