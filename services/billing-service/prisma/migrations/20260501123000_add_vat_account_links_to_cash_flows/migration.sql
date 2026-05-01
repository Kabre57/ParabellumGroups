ALTER TABLE "encaissements" ADD COLUMN "vatAccountingAccountId" TEXT;
ALTER TABLE "decaissements" ADD COLUMN "vatAccountingAccountId" TEXT;

CREATE INDEX "encaissements_vatAccountingAccountId_idx" ON "encaissements"("vatAccountingAccountId");
CREATE INDEX "decaissements_vatAccountingAccountId_idx" ON "decaissements"("vatAccountingAccountId");
