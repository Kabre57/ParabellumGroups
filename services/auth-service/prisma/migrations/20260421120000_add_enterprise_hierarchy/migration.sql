ALTER TABLE "enterprises"
  ADD COLUMN IF NOT EXISTS "parent_enterprise_id" INTEGER;

CREATE INDEX IF NOT EXISTS "enterprises_parent_enterprise_id_idx"
  ON "enterprises"("parent_enterprise_id");

DO $$
BEGIN
  ALTER TABLE "enterprises"
    ADD CONSTRAINT "enterprises_parent_enterprise_id_fkey"
    FOREIGN KEY ("parent_enterprise_id") REFERENCES "enterprises"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
