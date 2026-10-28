-- Compte de contrepartie choisi explicitement sur un bon de caisse
-- (débit pour un décaissement, crédit pour un encaissement).
ALTER TABLE "cash_vouchers" ADD COLUMN "counterpartAccountId" TEXT;

CREATE INDEX "cash_vouchers_counterpartAccountId_idx" ON "cash_vouchers"("counterpartAccountId");

ALTER TABLE "cash_vouchers"
  ADD CONSTRAINT "cash_vouchers_counterpartAccountId_fkey"
  FOREIGN KEY ("counterpartAccountId") REFERENCES "accounting_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
