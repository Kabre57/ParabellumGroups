-- CreateEnum
CREATE TYPE "StatusEmploye" AS ENUM ('ACTIF', 'CONGE', 'MALADIE', 'DEMISSION');

-- CreateEnum
CREATE TYPE "TypeConge" AS ENUM ('ANNUEL', 'MALADIE', 'SANS_SOLDE', 'PARENTAL');

-- CreateEnum
CREATE TYPE "StatusConge" AS ENUM ('DEMANDE', 'APPROUVE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypePresence" AS ENUM ('BUREAU', 'TELETRAVAIL', 'DEPLACEMENT', 'ABSENCE');

-- CreateTable
CREATE TABLE "employes" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "dateEmbauche" TIMESTAMP(3) NOT NULL,
    "poste" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "salaire" DECIMAL(10,2) NOT NULL,
    "status" "StatusEmploye" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conges" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "typeConge" "TypeConge" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "nbJours" INTEGER NOT NULL,
    "motif" TEXT,
    "status" "StatusConge" NOT NULL DEFAULT 'DEMANDE',
    "approbateurId" TEXT,
    "dateApprobation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presences" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureArrivee" TIMESTAMP(3),
    "heureDepart" TIMESTAMP(3),
    "duree" DECIMAL(5,2),
    "type" "TypePresence" NOT NULL DEFAULT 'BUREAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "evaluateurId" TEXT NOT NULL,
    "dateEvaluation" TIMESTAMP(3) NOT NULL,
    "periode" TEXT NOT NULL,
    "noteGlobale" DECIMAL(3,2) NOT NULL,
    "competences" JSONB NOT NULL,
    "commentaires" TEXT,
    "objectifs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employes_matricule_key" ON "employes"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "employes_email_key" ON "employes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "presences_employeId_date_key" ON "presences"("employeId", "date");

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_approbateurId_fkey" FOREIGN KEY ("approbateurId") REFERENCES "employes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluateurId_fkey" FOREIGN KEY ("evaluateurId") REFERENCES "employes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
