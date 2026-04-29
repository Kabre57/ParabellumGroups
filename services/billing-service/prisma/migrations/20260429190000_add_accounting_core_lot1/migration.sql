-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AccountingPeriodType" AS ENUM ('MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AccountingJournalType" AS ENUM ('SALES', 'PURCHASE', 'BANK', 'CASH', 'GENERAL', 'PAYROLL', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "AccountingJournalEntryStatus" AS ENUM ('DRAFT', 'VALIDATED', 'POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "periodType" "AccountingPeriodType" NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_journals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AccountingJournalType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enterpriseId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounting_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_entry_sequences" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounting_entry_sequences_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "accounting_accounts"
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "categoryCode" TEXT,
  ADD COLUMN "allowManualPosting" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requiresThirdParty" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresCostCenter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "accounting_journal_entries"
  ADD COLUMN "journalId" TEXT,
  ADD COLUMN "periodId" TEXT,
  ADD COLUMN "fiscalYearId" TEXT,
  ADD COLUMN "status" "AccountingJournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "postedAt" TIMESTAMP(3),
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "validatedByUserId" TEXT,
  ADD COLUMN "reversedEntryId" TEXT,
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "accounting_journal_lines"
  ADD COLUMN "enterpriseId" INTEGER,
  ADD COLUMN "thirdPartyId" TEXT,
  ADD COLUMN "thirdPartyName" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN "exchangeRate" DOUBLE PRECISION,
  ADD COLUMN "amountCurrency" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_code_key" ON "fiscal_years"("code");
CREATE INDEX "fiscal_years_startDate_endDate_idx" ON "fiscal_years"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_fiscalYearId_code_key" ON "accounting_periods"("fiscalYearId", "code");
CREATE INDEX "accounting_periods_fiscalYearId_idx" ON "accounting_periods"("fiscalYearId");
CREATE INDEX "accounting_periods_startDate_endDate_idx" ON "accounting_periods"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_journals_code_key" ON "accounting_journals"("code");
CREATE INDEX "accounting_journals_type_idx" ON "accounting_journals"("type");
CREATE INDEX "accounting_journals_isActive_idx" ON "accounting_journals"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_entry_sequences_journalId_periodId_key" ON "accounting_entry_sequences"("journalId", "periodId");
CREATE INDEX "accounting_entry_sequences_periodId_idx" ON "accounting_entry_sequences"("periodId");

-- CreateIndex
CREATE INDEX "accounting_accounts_parentId_idx" ON "accounting_accounts"("parentId");
CREATE INDEX "accounting_journal_entries_journalId_idx" ON "accounting_journal_entries"("journalId");
CREATE INDEX "accounting_journal_entries_periodId_idx" ON "accounting_journal_entries"("periodId");
CREATE INDEX "accounting_journal_entries_status_idx" ON "accounting_journal_entries"("status");
CREATE INDEX "accounting_journal_lines_enterpriseId_idx" ON "accounting_journal_lines"("enterpriseId");
CREATE INDEX "accounting_journal_lines_thirdPartyId_idx" ON "accounting_journal_lines"("thirdPartyId");

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_fiscalYearId_fkey"
FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounting_entry_sequences" ADD CONSTRAINT "accounting_entry_sequences_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "accounting_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounting_entry_sequences" ADD CONSTRAINT "accounting_entry_sequences_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accounting_accounts" ADD CONSTRAINT "accounting_accounts_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "accounting_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_journalId_fkey"
FOREIGN KEY ("journalId") REFERENCES "accounting_journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "accounting_journal_entries" ADD CONSTRAINT "accounting_journal_entries_fiscalYearId_fkey"
FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
