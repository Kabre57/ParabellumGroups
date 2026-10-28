-- AlterTable: change type column to text
ALTER TABLE "operational_requests" ALTER COLUMN "type" TYPE TEXT;

-- DropEnum
DROP TYPE IF EXISTS "OperationalRequestType";

-- CreateTable
CREATE TABLE "operational_request_type_configs" (
  "id" TEXT NOT NULL,
  "enterpriseId" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "operational_request_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_request_type_configs_enterpriseId_code_key" ON "operational_request_type_configs"("enterpriseId", "code");

-- CreateIndex
CREATE INDEX "operational_request_type_configs_enterpriseId_isActive_idx" ON "operational_request_type_configs"("enterpriseId", "isActive");
