CREATE TABLE "purchase_commitments" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceNumber" TEXT NOT NULL,
    "serviceId" INTEGER,
    "serviceName" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "amountHT" DOUBLE PRECISION NOT NULL,
    "amountTVA" DOUBLE PRECISION NOT NULL,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_commitments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_processed_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_processed_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_commitments_sourceType_sourceId_key" ON "purchase_commitments"("sourceType", "sourceId");
CREATE INDEX "purchase_commitments_status_idx" ON "purchase_commitments"("status");
CREATE UNIQUE INDEX "billing_processed_events_eventId_key" ON "billing_processed_events"("eventId");
CREATE INDEX "billing_processed_events_eventType_idx" ON "billing_processed_events"("eventType");
