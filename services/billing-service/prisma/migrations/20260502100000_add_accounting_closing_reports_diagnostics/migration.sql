CREATE TYPE "AccountingClosingStatus" AS ENUM ('DRAFT', 'CLOSED', 'VALIDATED', 'CANCELLED');
CREATE TYPE "AccountingReportType" AS ENUM ('TRIAL_BALANCE', 'GENERAL_LEDGER', 'BALANCE_SHEET', 'INCOME_STATEMENT', 'REGULATORY', 'DIAGNOSTIC');

CREATE TABLE "accounting_closings" (
  "id" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "status" "AccountingClosingStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "snapshotData" JSONB,
  "createdByUserId" TEXT,
  "validatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accounting_closings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounting_report_snapshots" (
  "id" TEXT NOT NULL,
  "reportType" "AccountingReportType" NOT NULL,
  "periodId" TEXT,
  "fiscalYearId" TEXT,
  "enterpriseId" INTEGER,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedByUserId" TEXT,
  "parameters" JSONB NOT NULL,
  "payload" JSONB NOT NULL,

  CONSTRAINT "accounting_report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounting_diagnostic_runs" (
  "id" TEXT NOT NULL,
  "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
  "status" TEXT NOT NULL,
  "summary" JSONB NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_diagnostic_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounting_diagnostic_issues" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "message" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_diagnostic_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounting_closings_periodId_idx" ON "accounting_closings"("periodId");
CREATE INDEX "accounting_closings_status_idx" ON "accounting_closings"("status");
CREATE INDEX "accounting_report_snapshots_reportType_idx" ON "accounting_report_snapshots"("reportType");
CREATE INDEX "accounting_report_snapshots_periodId_idx" ON "accounting_report_snapshots"("periodId");
CREATE INDEX "accounting_report_snapshots_fiscalYearId_idx" ON "accounting_report_snapshots"("fiscalYearId");
CREATE INDEX "accounting_report_snapshots_enterpriseId_idx" ON "accounting_report_snapshots"("enterpriseId");
CREATE INDEX "accounting_diagnostic_runs_runDate_idx" ON "accounting_diagnostic_runs"("runDate");
CREATE INDEX "accounting_diagnostic_runs_status_idx" ON "accounting_diagnostic_runs"("status");
CREATE INDEX "accounting_diagnostic_issues_runId_idx" ON "accounting_diagnostic_issues"("runId");
CREATE INDEX "accounting_diagnostic_issues_issueType_idx" ON "accounting_diagnostic_issues"("issueType");
CREATE INDEX "accounting_diagnostic_issues_severity_idx" ON "accounting_diagnostic_issues"("severity");

ALTER TABLE "accounting_closings" ADD CONSTRAINT "accounting_closings_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounting_report_snapshots" ADD CONSTRAINT "accounting_report_snapshots_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounting_report_snapshots" ADD CONSTRAINT "accounting_report_snapshots_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounting_diagnostic_issues" ADD CONSTRAINT "accounting_diagnostic_issues_runId_fkey" FOREIGN KEY ("runId") REFERENCES "accounting_diagnostic_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
