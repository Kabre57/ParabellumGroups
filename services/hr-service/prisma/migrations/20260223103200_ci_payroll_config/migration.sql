-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD', 'STAGE', 'INTERIM', 'PRESTATION');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIF', 'TERMINE', 'SUSPENDU', 'RUPTURE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('BROUILLON', 'GENERE', 'VALIDE', 'PAYE');

-- CreateEnum
CREATE TYPE "TaxSettingType" AS ENUM ('CNPS_RET_EMPLOYEE', 'CNPS_RET_EMPLOYER', 'CNPS_FAMILY', 'CNPS_AT', 'CNAM_EMPLOYER', 'FDFP_EMPLOYER', 'IS_EMPLOYER', 'AS_EMPLOYER');

-- AlterTable
ALTER TABLE "employes" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "categorie" TEXT,
ADD COLUMN     "cnamNumber" TEXT,
ADD COLUMN     "cnpsNumber" TEXT,
ADD COLUMN     "dateNaissance" TIMESTAMP(3),
ADD COLUMN     "deviseSalaire" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN     "lieuNaissance" TEXT,
ADD COLUMN     "nationalite" TEXT,
ADD COLUMN     "niveau" TEXT,
ADD COLUMN     "nombreEnfants" INTEGER DEFAULT 0,
ADD COLUMN     "partsFiscales" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "situationMatrimoniale" TEXT,
ALTER COLUMN "salaire" SET DATA TYPE DECIMAL(12,2);

-- CreateTable
CREATE TABLE "contrats" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "statut" "ContractStatus" NOT NULL DEFAULT 'ACTIF',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "poste" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "salaireBase" DECIMAL(12,2) NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "heuresHebdo" INTEGER,
    "cnpsTauxSalarie" DECIMAL(5,4),
    "cnpsTauxEmployeur" DECIMAL(5,4),
    "cnamTauxEmployeur" DECIMAL(5,4),
    "cnpsAT" DECIMAL(5,4),
    "riskBandId" TEXT,
    "autresAvantages" JSONB,
    "clauses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "periode" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "baseSalaire" DECIMAL(12,2) NOT NULL,
    "heuresSup" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "primes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "indemnite" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "autresRetenues" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" JSONB,
    "partsFiscales" INTEGER NOT NULL DEFAULT 1,
    "brut" DECIMAL(12,2) NOT NULL,
    "cnpsSalarial" DECIMAL(12,2) NOT NULL,
    "cnpsPatronal" DECIMAL(12,2) NOT NULL,
    "cnpsATUtilise" DECIMAL(12,2) NOT NULL,
    "cnam" DECIMAL(12,2) NOT NULL,
    "fdfp" DECIMAL(12,2) NOT NULL,
    "igr" DECIMAL(12,2) NOT NULL,
    "cotisationsSalariales" DECIMAL(12,2) NOT NULL,
    "cotisationsPatronales" DECIMAL(12,2) NOT NULL,
    "netImposable" DECIMAL(12,2) NOT NULL,
    "netAPayer" DECIMAL(12,2) NOT NULL,
    "statut" "PayrollStatus" NOT NULL DEFAULT 'GENERE',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_settings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TaxSettingType" NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "ceiling" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_constants" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(14,4) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_constants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_bands" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "departement" TEXT,
    "secteur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "igr_brackets" (
    "id" TEXT NOT NULL,
    "min" DECIMAL(14,2) NOT NULL,
    "max" DECIMAL(14,2),
    "rate" DECIMAL(10,4) NOT NULL,
    "deduction" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "igr_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrats_employeId_idx" ON "contrats"("employeId");

-- CreateIndex
CREATE INDEX "contrats_riskBandId_idx" ON "contrats"("riskBandId");

-- CreateIndex
CREATE INDEX "payroll_periode" ON "payroll"("employeId", "annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "tax_settings_code_key" ON "tax_settings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_constants_key_key" ON "payroll_constants"("key");

-- CreateIndex
CREATE UNIQUE INDEX "risk_bands_code_key" ON "risk_bands"("code");

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrats" ADD CONSTRAINT "contrats_riskBandId_fkey" FOREIGN KEY ("riskBandId") REFERENCES "risk_bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
