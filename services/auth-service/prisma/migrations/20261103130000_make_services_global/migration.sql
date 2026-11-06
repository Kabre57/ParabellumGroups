-- Services are a system-wide catalog. Keep the service rows and their user
-- assignments, but remove the legacy company ownership relation.
DROP INDEX IF EXISTS "services_name_enterprise_id_key";
DROP INDEX IF EXISTS "services_unassigned_name_key";
DROP INDEX IF EXISTS "services_enterprise_id_idx";
UPDATE "services" SET "enterprise_id" = NULL;
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_enterprise_id_fkey";
ALTER TABLE "services" DROP COLUMN IF EXISTS "enterprise_id";
