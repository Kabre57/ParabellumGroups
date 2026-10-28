-- Supprimer l'ancien index d'unicité globale qui bloquait les entreprises distinctes
DROP INDEX IF EXISTS "accounting_family_rules_one_primary_per_family";
DROP INDEX IF EXISTS "accounting_family_rules_family_accountId_key";

-- Recréer un index partiel pour garantir 1 seul compte primaire par famille ET par entreprise
-- Cas avec enterpriseId renseigné
CREATE UNIQUE INDEX "accounting_family_rules_one_primary_per_family_enterprise"
ON "accounting_family_rules"("family", "enterpriseId")
WHERE "isPrimary" = true AND "enterpriseId" IS NOT NULL;

-- Cas avec enterpriseId global (NULL)
CREATE UNIQUE INDEX "accounting_family_rules_one_primary_per_family_global"
ON "accounting_family_rules"("family")
WHERE "isPrimary" = true AND "enterpriseId" IS NULL;

-- Index d'unicité compte/famille prenant en compte l'entreprise
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_family_rules_family_accountId_enterpriseId_key"
ON "accounting_family_rules"("family", "accountId", "enterpriseId");
