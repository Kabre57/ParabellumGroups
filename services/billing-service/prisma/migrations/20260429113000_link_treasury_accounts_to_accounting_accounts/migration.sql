ALTER TABLE "treasury_accounts"
ADD COLUMN IF NOT EXISTS "accountingAccountId" TEXT;

CREATE INDEX IF NOT EXISTS "treasury_accounts_accountingAccountId_idx"
ON "treasury_accounts"("accountingAccountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'treasury_accounts_accountingAccountId_fkey'
  ) THEN
    ALTER TABLE "treasury_accounts"
    ADD CONSTRAINT "treasury_accounts_accountingAccountId_fkey"
    FOREIGN KEY ("accountingAccountId") REFERENCES "accounting_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
