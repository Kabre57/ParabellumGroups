ALTER TABLE "purchase_commitments"
ADD COLUMN IF NOT EXISTS "sourceStatus" TEXT;

ALTER TABLE "purchase_commitments"
ALTER COLUMN "status" DROP NOT NULL;
