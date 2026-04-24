-- Extend quote workflow for commercial validation, billing handoff and history

ALTER TYPE "DevisStatus" ADD VALUE IF NOT EXISTS 'MODIFICATION_DEMANDEE';
ALTER TYPE "DevisStatus" ADD VALUE IF NOT EXISTS 'TRANSMIS_FACTURATION';
ALTER TYPE "DevisStatus" ADD VALUE IF NOT EXISTS 'FACTURE';

ALTER TABLE "devis"
  ADD COLUMN IF NOT EXISTS "objet" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientRespondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientComment" TEXT,
  ADD COLUMN IF NOT EXISTS "revisionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "clientAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "clientAccessTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "forwardedToBillingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "forwardedToBillingBy" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedInvoiceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refusedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "devis_clientAccessToken_key" ON "devis"("clientAccessToken");

CREATE TABLE IF NOT EXISTS "devis_events" (
  "id" TEXT NOT NULL,
  "devisId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "actorRole" TEXT,
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devis_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "devis_events_devisId_idx" ON "devis_events"("devisId");
CREATE INDEX IF NOT EXISTS "devis_events_type_idx" ON "devis_events"("type");
CREATE INDEX IF NOT EXISTS "devis_events_createdAt_idx" ON "devis_events"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'devis_events_devisId_fkey'
      AND table_name = 'devis_events'
  ) THEN
    ALTER TABLE "devis_events"
      ADD CONSTRAINT "devis_events_devisId_fkey"
      FOREIGN KEY ("devisId") REFERENCES "devis"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
