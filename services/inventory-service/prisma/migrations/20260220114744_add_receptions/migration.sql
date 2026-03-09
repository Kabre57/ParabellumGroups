-- CreateEnum
CREATE TYPE "StatusReception" AS ENUM ('EN_ATTENTE', 'PARTIELLE', 'COMPLETE', 'VERIFIEE');

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "bonCommandeId" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusReception" NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneReception" (
    "id" TEXT NOT NULL,
    "receptionId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantitePrev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantiteRecue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tva" DOUBLE PRECISION,
    "ecart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneReception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reception_numero_key" ON "Reception"("numero");

-- CreateIndex
CREATE INDEX "Reception_bonCommandeId_idx" ON "Reception"("bonCommandeId");

-- CreateIndex
CREATE INDEX "Reception_status_idx" ON "Reception"("status");

-- CreateIndex
CREATE INDEX "Reception_dateReception_idx" ON "Reception"("dateReception");

-- CreateIndex
CREATE INDEX "LigneReception_receptionId_idx" ON "LigneReception"("receptionId");

-- CreateIndex
CREATE INDEX "LigneReception_articleId_idx" ON "LigneReception"("articleId");

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
