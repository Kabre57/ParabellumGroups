/*
  Warnings:

  - You are about to drop the column `image_url` on the `services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "services" DROP COLUMN "image_url",
ADD COLUMN     "enterprise_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "enterprise_id" INTEGER;

-- CreateTable
CREATE TABLE "enterprises" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enterprise_code" VARCHAR(10),
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_name_key" ON "enterprises"("name");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_enterprise_code_key" ON "enterprises"("enterprise_code");

-- CreateIndex
CREATE INDEX "enterprises_is_active_idx" ON "enterprises"("is_active");

-- CreateIndex
CREATE INDEX "services_enterprise_id_idx" ON "services"("enterprise_id");

-- CreateIndex
CREATE INDEX "users_enterprise_id_idx" ON "users"("enterprise_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
