-- AlterTable
ALTER TABLE "demandes_achat"
ADD COLUMN "enterpriseId" INTEGER,
ADD COLUMN "enterpriseName" TEXT;

-- AlterTable
ALTER TABLE "bons_commande"
ADD COLUMN "enterpriseId" INTEGER,
ADD COLUMN "enterpriseName" TEXT;

-- Index
CREATE INDEX "demandes_achat_enterpriseId_idx" ON "demandes_achat"("enterpriseId");

-- Index
CREATE INDEX "bons_commande_enterpriseId_idx" ON "bons_commande"("enterpriseId");
