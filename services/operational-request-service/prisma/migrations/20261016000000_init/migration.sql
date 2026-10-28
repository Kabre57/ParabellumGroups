CREATE TYPE "OperationalRequestType" AS ENUM ('FUEL', 'TRANSPORT', 'MISSION', 'OTHER');
CREATE TYPE "OperationalRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED', 'DISBURSED', 'CLOSED');

CREATE TABLE "operational_requests" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "type" "OperationalRequestType" NOT NULL,
  "status" "OperationalRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "enterpriseId" INTEGER NOT NULL,
  "enterpriseName" TEXT NOT NULL,
  "serviceId" INTEGER,
  "serviceName" TEXT,
  "requesterId" TEXT NOT NULL,
  "requesterName" TEXT NOT NULL,
  "requesterEmail" TEXT,
  "beneficiaryName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amountRequested" DECIMAL(14,2) NOT NULL,
  "amountApproved" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "desiredDate" TIMESTAMP(3),
  "details" JSONB NOT NULL DEFAULT '{}',
  "decisionComment" TEXT,
  "cashVoucherId" TEXT,
  "cashVoucherNumber" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "disbursedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_request_logs" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "OperationalRequestStatus",
  "toStatus" "OperationalRequestStatus" NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_request_attachments" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_request_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operational_request_outbox_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_request_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operational_requests_requestNumber_key" ON "operational_requests"("requestNumber");
CREATE UNIQUE INDEX "operational_requests_cashVoucherId_key" ON "operational_requests"("cashVoucherId");
CREATE INDEX "operational_requests_enterpriseId_status_createdAt_idx" ON "operational_requests"("enterpriseId", "status", "createdAt");
CREATE INDEX "operational_requests_enterpriseId_requesterId_createdAt_idx" ON "operational_requests"("enterpriseId", "requesterId", "createdAt");
CREATE INDEX "operational_requests_requesterId_createdAt_idx" ON "operational_requests"("requesterId", "createdAt");
CREATE INDEX "operational_request_logs_requestId_createdAt_idx" ON "operational_request_logs"("requestId", "createdAt");
CREATE UNIQUE INDEX "operational_request_attachments_storageKey_key" ON "operational_request_attachments"("storageKey");
CREATE INDEX "operational_request_attachments_requestId_createdAt_idx" ON "operational_request_attachments"("requestId", "createdAt");
CREATE UNIQUE INDEX "operational_request_outbox_events_idempotencyKey_key" ON "operational_request_outbox_events"("idempotencyKey");
CREATE INDEX "operational_request_outbox_events_deliveredAt_nextAttemptAt_idx" ON "operational_request_outbox_events"("deliveredAt", "nextAttemptAt");

ALTER TABLE "operational_request_logs" ADD CONSTRAINT "operational_request_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "operational_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_request_attachments" ADD CONSTRAINT "operational_request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "operational_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
