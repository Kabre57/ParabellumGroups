-- Add optional prospect/opportunity linkage for signed quote workflow
ALTER TABLE "devis"
ADD COLUMN IF NOT EXISTS "prospectId" TEXT,
ADD COLUMN IF NOT EXISTS "opportuniteId" TEXT;

CREATE INDEX IF NOT EXISTS "devis_prospectId_idx" ON "devis"("prospectId");
CREATE INDEX IF NOT EXISTS "devis_opportuniteId_idx" ON "devis"("opportuniteId");
