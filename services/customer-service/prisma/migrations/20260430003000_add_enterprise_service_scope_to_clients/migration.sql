ALTER TABLE "clients"
ADD COLUMN "enterpriseId" INTEGER,
ADD COLUMN "serviceId" INTEGER;

CREATE INDEX "clients_enterpriseId_idx" ON "clients"("enterpriseId");
CREATE INDEX "clients_serviceId_idx" ON "clients"("serviceId");
