ALTER TABLE "accounting_family_definitions"
ADD COLUMN "enterpriseId" INTEGER;

CREATE INDEX "accounting_family_definitions_enterpriseId_idx"
ON "accounting_family_definitions"("enterpriseId");

UPDATE "accounting_family_rules" AS rule
SET "enterpriseId" = account."enterpriseId"
FROM "accounting_accounts" AS account
WHERE rule."accountId" = account."id"
  AND rule."enterpriseId" IS NULL
  AND account."enterpriseId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "accounting_family_rules" AS scoped_rule
    WHERE scoped_rule."family" = rule."family"
      AND scoped_rule."accountId" = rule."accountId"
      AND scoped_rule."enterpriseId" = account."enterpriseId"
  );

DO $$
DECLARE
  definition_row RECORD;
  enterprise_ids INTEGER[];
  target_enterprise_id INTEGER;
  new_code TEXT;
  suffix INTEGER;
BEGIN
  FOR definition_row IN
    SELECT *
    FROM "accounting_family_definitions"
    WHERE "isSystem" = false
    ORDER BY "code"
  LOOP
    SELECT array_agg(DISTINCT rule."enterpriseId" ORDER BY rule."enterpriseId")
    INTO enterprise_ids
    FROM "accounting_family_rules" AS rule
    WHERE rule."family" = definition_row."code"
      AND rule."enterpriseId" IS NOT NULL;

    IF COALESCE(array_length(enterprise_ids, 1), 0) = 1 THEN
      UPDATE "accounting_family_definitions"
      SET "enterpriseId" = enterprise_ids[1]
      WHERE "id" = definition_row."id";
    ELSIF COALESCE(array_length(enterprise_ids, 1), 0) > 1 THEN
      UPDATE "accounting_family_definitions"
      SET "enterpriseId" = enterprise_ids[1]
      WHERE "id" = definition_row."id";

      FOREACH target_enterprise_id IN ARRAY enterprise_ids[2:array_length(enterprise_ids, 1)]
      LOOP
        new_code := definition_row."code" || '_E' || target_enterprise_id::TEXT;
        suffix := 1;
        WHILE EXISTS (
          SELECT 1 FROM "accounting_family_definitions" WHERE "code" = new_code
        ) LOOP
          new_code := definition_row."code" || '_E' || target_enterprise_id::TEXT || '_' || suffix::TEXT;
          suffix := suffix + 1;
        END LOOP;

        INSERT INTO "accounting_family_definitions" (
          "id", "code", "enterpriseId", "label", "description", "displayType",
          "accountType", "isSystem", "sortOrder", "createdByUserId", "createdByEmail",
          "createdAt", "updatedAt"
        ) VALUES (
          'family_' || md5(definition_row."id" || ':' || target_enterprise_id::TEXT),
          new_code,
          target_enterprise_id,
          definition_row."label",
          definition_row."description",
          definition_row."displayType",
          definition_row."accountType",
          false,
          definition_row."sortOrder",
          definition_row."createdByUserId",
          definition_row."createdByEmail",
          definition_row."createdAt",
          definition_row."updatedAt"
        );

        UPDATE "accounting_family_rules"
        SET "family" = new_code
        WHERE "family" = definition_row."code"
          AND "enterpriseId" = target_enterprise_id;
      END LOOP;
    END IF;
  END LOOP;
END $$;
