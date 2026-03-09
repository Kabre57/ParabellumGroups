-- AlterTable
ALTER TABLE "rapports" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
