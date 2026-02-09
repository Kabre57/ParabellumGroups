/*
  Warnings:

  - You are about to drop the column `granted` on the `user_permissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_permissions" DROP COLUMN "granted",
ADD COLUMN     "can_approve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_create" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_delete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_edit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_view" BOOLEAN NOT NULL DEFAULT false;
