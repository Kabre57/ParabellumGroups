-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('CHART', 'TABLE', 'KPI', 'MAP');

-- CreateEnum
CREATE TYPE "RapportType" AS ENUM ('VENTES', 'FINANCES', 'RH', 'PROJETS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RapportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV');

-- CreateEnum
CREATE TYPE "RapportFrequence" AS ENUM ('QUOTIDIEN', 'HEBDO', 'MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "RapportExecutionStatut" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "KPITendance" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "parDefaut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL,
    "titre" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL DEFAULT '{}',
    "refresh" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "type" "RapportType" NOT NULL,
    "format" "RapportFormat" NOT NULL,
    "frequence" "RapportFrequence" NOT NULL,
    "parametres" JSONB NOT NULL DEFAULT '{}',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportExecution" (
    "id" TEXT NOT NULL,
    "rapportId" TEXT NOT NULL,
    "dateExecution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "RapportExecutionStatut" NOT NULL,
    "fichier" TEXT,
    "erreur" TEXT,
    "duree" INTEGER,

    CONSTRAINT "RapportExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "cible" DOUBLE PRECISION,
    "unite" TEXT,
    "dateCalcul" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tendance" "KPITendance" NOT NULL DEFAULT 'STABLE',
    "variation" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dashboard_userId_idx" ON "Dashboard"("userId");

-- CreateIndex
CREATE INDEX "Widget_dashboardId_idx" ON "Widget"("dashboardId");

-- CreateIndex
CREATE INDEX "RapportExecution_rapportId_idx" ON "RapportExecution"("rapportId");

-- CreateIndex
CREATE INDEX "RapportExecution_dateExecution_idx" ON "RapportExecution"("dateExecution");

-- CreateIndex
CREATE INDEX "KPI_categorie_idx" ON "KPI"("categorie");

-- CreateIndex
CREATE INDEX "KPI_dateCalcul_idx" ON "KPI"("dateCalcul");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportExecution" ADD CONSTRAINT "RapportExecution_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "Rapport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
