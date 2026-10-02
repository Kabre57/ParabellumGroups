CREATE TABLE "treasury_transfers" (
    "id" TEXT NOT NULL,
    "sourceTreasuryAccountId" TEXT NOT NULL,
    "destinationTreasuryAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "enterpriseId" INTEGER,
    "enterpriseName" TEXT,
    "createdByUserId" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "treasury_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "treasury_transfers_date_idx" ON "treasury_transfers"("date");
CREATE INDEX "treasury_transfers_sourceTreasuryAccountId_idx" ON "treasury_transfers"("sourceTreasuryAccountId");
CREATE INDEX "treasury_transfers_destinationTreasuryAccountId_idx" ON "treasury_transfers"("destinationTreasuryAccountId");
CREATE INDEX "treasury_transfers_enterpriseId_idx" ON "treasury_transfers"("enterpriseId");

ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_sourceTreasuryAccountId_fkey"
    FOREIGN KEY ("sourceTreasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_destinationTreasuryAccountId_fkey"
    FOREIGN KEY ("destinationTreasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
