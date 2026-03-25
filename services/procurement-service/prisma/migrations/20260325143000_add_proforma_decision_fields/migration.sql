ALTER TABLE "proformas"
  ADD COLUMN IF NOT EXISTS "delaiLivraisonJours" INTEGER,
  ADD COLUMN IF NOT EXISTS "disponibilite" TEXT,
  ADD COLUMN IF NOT EXISTS "observationsAchat" TEXT,
  ADD COLUMN IF NOT EXISTS "recommendedForApproval" BOOLEAN NOT NULL DEFAULT false;
