DO $$
BEGIN
  CREATE TYPE "AvoirStatus" AS ENUM ('BROUILLON', 'EMISE', 'APPLIQUE', 'ANNULE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "avoirs" (
  "id" TEXT NOT NULL,
  "numeroAvoir" TEXT NOT NULL,
  "factureId" TEXT NOT NULL,
  "factureNumero" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "serviceId" TEXT,
  "serviceName" TEXT,
  "serviceLogoUrl" TEXT,
  "motif" TEXT NOT NULL,
  "notes" TEXT,
  "montantHT" DOUBLE PRECISION NOT NULL,
  "montantTVA" DOUBLE PRECISION NOT NULL,
  "montantTTC" DOUBLE PRECISION NOT NULL,
  "status" "AvoirStatus" NOT NULL DEFAULT 'BROUILLON',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "avoirs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lignes_avoir" (
  "id" TEXT NOT NULL,
  "avoirId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantite" DOUBLE PRECISION NOT NULL,
  "prixUnitaire" DOUBLE PRECISION NOT NULL,
  "tauxTVA" DOUBLE PRECISION NOT NULL,
  "montantHT" DOUBLE PRECISION NOT NULL,
  "montantTVA" DOUBLE PRECISION NOT NULL,
  "montantTTC" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lignes_avoir_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "avoirs_numeroAvoir_key" ON "avoirs"("numeroAvoir");
CREATE INDEX IF NOT EXISTS "avoirs_factureId_idx" ON "avoirs"("factureId");
CREATE INDEX IF NOT EXISTS "avoirs_clientId_idx" ON "avoirs"("clientId");
CREATE INDEX IF NOT EXISTS "avoirs_status_idx" ON "avoirs"("status");
CREATE INDEX IF NOT EXISTS "avoirs_createdAt_idx" ON "avoirs"("createdAt");
CREATE INDEX IF NOT EXISTS "lignes_avoir_avoirId_idx" ON "lignes_avoir"("avoirId");

DO $$
BEGIN
  ALTER TABLE "avoirs"
    ADD CONSTRAINT "avoirs_factureId_fkey"
    FOREIGN KEY ("factureId") REFERENCES "factures"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "lignes_avoir"
    ADD CONSTRAINT "lignes_avoir_avoirId_fkey"
    FOREIGN KEY ("avoirId") REFERENCES "avoirs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
