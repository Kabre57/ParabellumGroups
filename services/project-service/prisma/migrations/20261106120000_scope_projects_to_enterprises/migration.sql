-- Existing projects remain unassigned until their ownership has been reviewed.
-- Never infer the enterprise from the deploying user or an arbitrary default.
ALTER TABLE "Projet" ADD COLUMN "enterpriseId" INTEGER;

CREATE INDEX "Projet_enterpriseId_idx" ON "Projet"("enterpriseId");
