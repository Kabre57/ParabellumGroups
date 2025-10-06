/*
  Warnings:

  - You are about to drop the column `employee_id` on the `contracts` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `loans` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `performance_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `salaries` table. All the data in the column will be lost.
  - You are about to drop the `employees` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employee_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[registration_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `leave_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `loans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `performance_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `salaries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."contracts" DROP CONSTRAINT "contracts_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_service_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."expenses" DROP CONSTRAINT "expenses_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."leave_requests" DROP CONSTRAINT "leave_requests_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."loans" DROP CONSTRAINT "loans_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."performance_reviews" DROP CONSTRAINT "performance_reviews_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."salaries" DROP CONSTRAINT "salaries_employee_id_fkey";

-- AlterTable
ALTER TABLE "public"."contracts" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."expenses" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."leave_requests" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."loans" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."materiels" ADD COLUMN     "garantie" TEXT,
ALTER COLUMN "statut" SET DEFAULT 'actif';

-- AlterTable
ALTER TABLE "public"."performance_reviews" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."salaries" DROP COLUMN "employee_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."time_off_requests" ADD COLUMN     "intervention_id" INTEGER,
ADD COLUMN     "mission_id" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bank_account" TEXT,
ADD COLUMN     "cnam_number" TEXT,
ADD COLUMN     "cnps_number" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "emergency_contact" TEXT,
ADD COLUMN     "employee_number" TEXT,
ADD COLUMN     "hire_date" TIMESTAMP(3),
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "place_of_birth" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "professional_category" TEXT,
ADD COLUMN     "professional_level" TEXT,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "social_security_number" TEXT;

-- DropTable
DROP TABLE "public"."employees";

-- CreateTable
CREATE TABLE "public"."entrees_materiel" (
    "id" SERIAL NOT NULL,
    "materiel_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'achat',
    "prix_total" DOUBLE PRECISION,
    "fournisseur" TEXT,
    "facture" TEXT,
    "commentaire" TEXT,
    "date_entree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrees_materiel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_number_key" ON "public"."users"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_registration_number_key" ON "public"."users"("registration_number");

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salaries" ADD CONSTRAINT "salaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entrees_materiel" ADD CONSTRAINT "entrees_materiel_materiel_id_fkey" FOREIGN KEY ("materiel_id") REFERENCES "public"."materiels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_reviews" ADD CONSTRAINT "performance_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_off_requests" ADD CONSTRAINT "time_off_requests_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_off_requests" ADD CONSTRAINT "time_off_requests_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("num_intervention") ON DELETE SET NULL ON UPDATE CASCADE;
