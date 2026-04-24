ALTER TABLE "lignes_facture"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

ALTER TABLE "lignes_devis"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
