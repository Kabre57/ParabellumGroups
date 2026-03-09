/*
  Warnings:

  - A unique constraint covering the columns `[service_code]` on the table `services` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "manager_id" INTEGER,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "service_code" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "services_service_code_key" ON "services"("service_code");

-- CreateIndex
CREATE INDEX "services_parent_id_idx" ON "services"("parent_id");

-- CreateIndex
CREATE INDEX "services_manager_id_idx" ON "services"("manager_id");

-- CreateIndex
CREATE INDEX "services_is_active_idx" ON "services"("is_active");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
