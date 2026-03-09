-- CreateEnum
CREATE TYPE "StatusFournisseur" AS ENUM ('ACTIF', 'INACTIF', 'BLOQUE');

-- CreateEnum
CREATE TYPE "StatusDemandeAchat" AS ENUM ('BROUILLON', 'SOUMISE', 'APPROUVEE', 'REJETEE', 'COMMANDEE');

-- CreateEnum
CREATE TYPE "StatusBonCommande" AS ENUM ('BROUILLON', 'ENVOYE', 'CONFIRME', 'LIVRE', 'ANNULE');

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "categorieActivite" TEXT,
    "status" "StatusFournisseur" NOT NULL DEFAULT 'ACTIF',
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_achat" (
    "id" TEXT NOT NULL,
    "numeroDemande" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "demandeurId" TEXT NOT NULL,
    "dateDemande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantEstime" DECIMAL(12,2),
    "status" "StatusDemandeAchat" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande" (
    "id" TEXT NOT NULL,
    "numeroBon" TEXT NOT NULL,
    "demandeAchatId" TEXT,
    "fournisseurId" TEXT NOT NULL,
    "dateCommande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLivraison" TIMESTAMP(3),
    "montantTotal" DECIMAL(12,2) NOT NULL,
    "status" "StatusBonCommande" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" TEXT NOT NULL,
    "bonCommandeId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fournisseurs_email_key" ON "fournisseurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_achat_numeroDemande_key" ON "demandes_achat"("numeroDemande");

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_numeroBon_key" ON "bons_commande"("numeroBon");

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_demandeAchatId_fkey" FOREIGN KEY ("demandeAchatId") REFERENCES "demandes_achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "bons_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
