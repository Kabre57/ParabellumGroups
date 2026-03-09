-- CreateEnum
CREATE TYPE "StatusProjet" AS ENUM ('PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatusTache" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINEE', 'BLOQUEE');

-- CreateEnum
CREATE TYPE "StatusJalon" AS ENUM ('PLANIFIE', 'ATTEINT', 'MANQUE');

-- CreateTable
CREATE TABLE "Projet" (
    "id" TEXT NOT NULL,
    "numeroProjet" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "budget" DECIMAL(15,2),
    "coutReel" DECIMAL(15,2) DEFAULT 0,
    "status" "StatusProjet" NOT NULL DEFAULT 'PLANIFIE',
    "priorite" "Priorite" NOT NULL DEFAULT 'MOYENNE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tache" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "dureeEstimee" INTEGER,
    "dureeReelle" INTEGER,
    "status" "StatusTache" NOT NULL DEFAULT 'A_FAIRE',
    "priorite" "Priorite" NOT NULL DEFAULT 'MOYENNE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheAssignation" (
    "id" TEXT NOT NULL,
    "tacheId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "dateAssignation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TacheAssignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jalon" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "status" "StatusJalon" NOT NULL DEFAULT 'PLANIFIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jalon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Projet_numeroProjet_key" ON "Projet"("numeroProjet");

-- CreateIndex
CREATE INDEX "Projet_clientId_idx" ON "Projet"("clientId");

-- CreateIndex
CREATE INDEX "Projet_status_idx" ON "Projet"("status");

-- CreateIndex
CREATE INDEX "Projet_numeroProjet_idx" ON "Projet"("numeroProjet");

-- CreateIndex
CREATE INDEX "Tache_projetId_idx" ON "Tache"("projetId");

-- CreateIndex
CREATE INDEX "Tache_status_idx" ON "Tache"("status");

-- CreateIndex
CREATE INDEX "TacheAssignation_userId_idx" ON "TacheAssignation"("userId");

-- CreateIndex
CREATE INDEX "TacheAssignation_tacheId_idx" ON "TacheAssignation"("tacheId");

-- CreateIndex
CREATE UNIQUE INDEX "TacheAssignation_tacheId_userId_key" ON "TacheAssignation"("tacheId", "userId");

-- CreateIndex
CREATE INDEX "Jalon_projetId_idx" ON "Jalon"("projetId");

-- CreateIndex
CREATE INDEX "Jalon_status_idx" ON "Jalon"("status");

-- AddForeignKey
ALTER TABLE "Tache" ADD CONSTRAINT "Tache_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheAssignation" ADD CONSTRAINT "TacheAssignation_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "Tache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jalon" ADD CONSTRAINT "Jalon_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
