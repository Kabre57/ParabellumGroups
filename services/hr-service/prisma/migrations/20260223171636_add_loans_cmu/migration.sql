-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('AVANCE', 'PRET');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('EN_COURS', 'TERMINE', 'ANNULE');

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "motif" TEXT,
    "montantInitial" DECIMAL(12,2) NOT NULL,
    "restantDu" DECIMAL(12,2) NOT NULL,
    "deductionMensuelle" DECIMAL(12,2) NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "statut" "LoanStatus" NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loans_employeId_idx" ON "loans"("employeId");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
