/*
  Warnings:

  - You are about to drop the column `entity_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_value` on the `audit_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."audit_logs" DROP COLUMN "entity_id",
DROP COLUMN "old_value",
ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "readAt" TIMESTAMP(3);
