CREATE TYPE "AccountingFamily" AS ENUM (
  'CUSTOMER_RECEIVABLE',
  'SUPPLIER_PAYABLE',
  'PURCHASE_EXPENSE',
  'MISC_EXPENSE',
  'REVENUE',
  'TREASURY_BANK',
  'TREASURY_CASH'
);

CREATE TABLE "accounting_family_rules" (
  "id" TEXT NOT NULL,
  "family" "AccountingFamily" NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "accountId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_family_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounting_family_rules_family_key" ON "accounting_family_rules"("family");
CREATE INDEX "accounting_family_rules_accountId_idx" ON "accounting_family_rules"("accountId");

ALTER TABLE "accounting_family_rules"
ADD CONSTRAINT "accounting_family_rules_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounting_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
