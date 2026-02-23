-- AlterTable
ALTER TABLE "devis" ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "serviceLogoUrl" TEXT;

-- AlterTable
ALTER TABLE "factures" ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "serviceLogoUrl" TEXT;
