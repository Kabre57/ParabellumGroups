ALTER TABLE "lignes_commande"
ADD COLUMN IF NOT EXISTS "unite" TEXT;

ALTER TABLE "lignes_demande_achat"
ADD COLUMN IF NOT EXISTS "unite" TEXT;

ALTER TABLE "lignes_proforma"
ADD COLUMN IF NOT EXISTS "unite" TEXT;
