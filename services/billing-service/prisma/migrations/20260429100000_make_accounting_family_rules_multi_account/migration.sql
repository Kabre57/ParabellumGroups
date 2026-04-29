ALTER TABLE "accounting_family_rules" DROP CONSTRAINT IF EXISTS "accounting_family_rules_family_key";

ALTER TABLE "accounting_family_rules"
ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "accounting_family_rules_family_accountId_key"
ON "accounting_family_rules"("family", "accountId");

CREATE INDEX IF NOT EXISTS "accounting_family_rules_family_isPrimary_idx"
ON "accounting_family_rules"("family", "isPrimary");

WITH ranked_rules AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "family" ORDER BY "createdAt" ASC, id ASC) AS row_num
  FROM "accounting_family_rules"
)
UPDATE "accounting_family_rules" afr
SET "isPrimary" = CASE WHEN rr.row_num = 1 THEN true ELSE false END
FROM ranked_rules rr
WHERE afr.id = rr.id;
