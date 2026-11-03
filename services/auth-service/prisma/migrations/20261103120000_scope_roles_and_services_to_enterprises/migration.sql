ALTER TABLE "roles"
ADD COLUMN "enterprise_id" INTEGER;

ALTER TABLE "roles"
ADD CONSTRAINT "roles_enterprise_id_fkey"
FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "roles_name_key";
CREATE UNIQUE INDEX "roles_name_enterprise_id_key"
ON "roles"("name", "enterprise_id");
CREATE UNIQUE INDEX "roles_global_name_key"
ON "roles"("name") WHERE "enterprise_id" IS NULL;
CREATE INDEX "roles_enterprise_id_idx" ON "roles"("enterprise_id");

DROP INDEX IF EXISTS "services_name_key";
CREATE UNIQUE INDEX "services_name_enterprise_id_key"
ON "services"("name", "enterprise_id");
CREATE UNIQUE INDEX "services_unassigned_name_key"
ON "services"("name") WHERE "enterprise_id" IS NULL;
