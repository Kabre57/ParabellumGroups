/*
  Warnings:

  - Added the required column `montantHT` to the `lignes_commande` table without a default value. This is not possible if the table is not empty.
  - Added the required column `montantTTC` to the `lignes_commande` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bon_commande_validation_logs_bonCommandeId_idx";

-- AlterTable
ALTER TABLE "lignes_commande" ADD COLUMN     "montantHT" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "montantTTC" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "tva" DECIMAL(5,2) NOT NULL DEFAULT 0;
