ALTER TABLE "factures"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "paiements"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "avoirs"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "devis"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "purchase_commitments"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "factures_fournisseurs"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "encaissements"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "decaissements"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "accounting_journal_entries"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

ALTER TABLE "cash_vouchers"
  ADD COLUMN IF NOT EXISTS "enterpriseId" INTEGER,
  ADD COLUMN IF NOT EXISTS "enterpriseName" TEXT;

CREATE INDEX IF NOT EXISTS "factures_enterpriseId_idx" ON "factures"("enterpriseId");
CREATE INDEX IF NOT EXISTS "paiements_enterpriseId_idx" ON "paiements"("enterpriseId");
CREATE INDEX IF NOT EXISTS "avoirs_enterpriseId_idx" ON "avoirs"("enterpriseId");
CREATE INDEX IF NOT EXISTS "devis_enterpriseId_idx" ON "devis"("enterpriseId");
CREATE INDEX IF NOT EXISTS "purchase_commitments_enterpriseId_idx" ON "purchase_commitments"("enterpriseId");
CREATE INDEX IF NOT EXISTS "factures_fournisseurs_enterpriseId_idx" ON "factures_fournisseurs"("enterpriseId");
CREATE INDEX IF NOT EXISTS "encaissements_enterpriseId_idx" ON "encaissements"("enterpriseId");
CREATE INDEX IF NOT EXISTS "decaissements_enterpriseId_idx" ON "decaissements"("enterpriseId");
CREATE INDEX IF NOT EXISTS "accounting_journal_entries_enterpriseId_idx" ON "accounting_journal_entries"("enterpriseId");
CREATE INDEX IF NOT EXISTS "cash_vouchers_enterpriseId_idx" ON "cash_vouchers"("enterpriseId");
