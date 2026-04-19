ALTER TABLE "prospects"
ADD COLUMN IF NOT EXISTS "rccm" TEXT,
ADD COLUMN IF NOT EXISTS "fax" TEXT,
ADD COLUMN IF NOT EXISTS "address3" TEXT,
ADD COLUMN IF NOT EXISTS "gpsCoordinates" TEXT,
ADD COLUMN IF NOT EXISTS "accessNotes" TEXT;

ALTER TABLE "prospects"
ALTER COLUMN "postalCode" DROP NOT NULL;

ALTER TABLE "prospects"
ALTER COLUMN "country" SET DEFAULT 'Cote d''Ivoire';

CREATE UNIQUE INDEX IF NOT EXISTS "prospects_rccm_key" ON "prospects"("rccm");
