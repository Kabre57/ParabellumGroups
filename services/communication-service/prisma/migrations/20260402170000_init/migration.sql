-- CreateEnum
CREATE TYPE "TypeMessage" AS ENUM ('EMAIL', 'SMS', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "StatusMessage" AS ENUM ('BROUILLON', 'ENVOYE', 'LU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS');

-- CreateEnum
CREATE TYPE "StatusCampagne" AS ENUM ('BROUILLON', 'PROGRAMMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "type" "TypeMessage" NOT NULL,
    "status" "StatusMessage" NOT NULL DEFAULT 'BROUILLON',
    "dateEnvoi" TIMESTAMP(3),
    "dateLu" TIMESTAMP(3),
    "pieceJointe" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "type" "TypeMessage" NOT NULL,
    "variables" JSONB,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL DEFAULT 'INFO',
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLu" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campagnes_mail" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "destinataires" JSONB NOT NULL,
    "objectif" TEXT,
    "segment" TEXT,
    "sequence" JSONB,
    "conditionsArret" JSONB,
    "dateEnvoi" TIMESTAMP(3),
    "status" "StatusCampagne" NOT NULL DEFAULT 'BROUILLON',
    "nbEnvoyes" INTEGER NOT NULL DEFAULT 0,
    "nbLus" INTEGER NOT NULL DEFAULT 0,
    "nbErreurs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campagnes_mail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campagnes_mail_templateId_idx" ON "campagnes_mail"("templateId");

-- AddForeignKey
ALTER TABLE "campagnes_mail" ADD CONSTRAINT "campagnes_mail_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
