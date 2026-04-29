UPDATE "accounting_family_rules" afr
SET "isPrimary" = ranked.keep_primary
FROM (
  SELECT
    id,
    CASE
      WHEN ROW_NUMBER() OVER (
        PARTITION BY "family"
        ORDER BY
          CASE WHEN "isPrimary" THEN 0 ELSE 1 END,
          "createdAt" ASC,
          id ASC
      ) = 1 THEN TRUE
      ELSE FALSE
    END AS keep_primary
  FROM "accounting_family_rules"
) ranked
WHERE afr.id = ranked.id;

CREATE UNIQUE INDEX "accounting_family_rules_one_primary_per_family"
ON "accounting_family_rules"("family")
WHERE "isPrimary" = TRUE;
