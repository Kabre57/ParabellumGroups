-- CreateEnum
CREATE TYPE "Unite" AS ENUM ('PIECE', 'KG', 'M', 'L');

-- CreateEnum
CREATE TYPE "StatusArticle" AS ENUM ('ACTIF', 'INACTIF', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT', 'TRANSFERT');

-- CreateEnum
CREATE TYPE "StatusInventaire" AS ENUM ('PLANIFIE', 'EN_COURS', 'TERMINE', 'VALIDE');

-- CreateEnum
CREATE TYPE "StatusEquipement" AS ENUM ('DISPONIBLE', 'EN_SERVICE', 'EN_PANNE', 'EN_MAINTENANCE', 'REFORME');

-- CreateEnum
CREATE TYPE "TypeMaintenance" AS ENUM ('PREVENTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "StatusMaintenance" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "unite" "Unite" NOT NULL DEFAULT 'PIECE',
    "prixAchat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixVente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantiteStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seuilAlerte" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seuilRupture" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emplacement" TEXT,
    "fournisseurId" TEXT,
    "status" "StatusArticle" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "dateOperation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateurId" TEXT NOT NULL,
    "numeroDocument" TEXT,
    "emplacement" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventaire" (
    "id" TEXT NOT NULL,
    "numeroInventaire" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "status" "StatusInventaire" NOT NULL DEFAULT 'PLANIFIE',
    "nbArticles" INTEGER NOT NULL DEFAULT 0,
    "nbEcarts" INTEGER NOT NULL DEFAULT 0,
    "montantEcart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneInventaire" (
    "id" TEXT NOT NULL,
    "inventaireId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "quantiteTheorique" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantiteReelle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ecart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valeurEcart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LigneInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "dateAchat" TIMESTAMP(3),
    "valeurAchat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "departement" TEXT,
    "utilisateurId" TEXT,
    "emplacement" TEXT,
    "status" "StatusEquipement" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEquipement" (
    "id" TEXT NOT NULL,
    "equipementId" TEXT NOT NULL,
    "type" "TypeMaintenance" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "technicienId" TEXT,
    "description" TEXT NOT NULL,
    "coutReel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusMaintenance" NOT NULL DEFAULT 'PLANIFIEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEquipement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_reference_key" ON "Article"("reference");

-- CreateIndex
CREATE INDEX "Article_reference_idx" ON "Article"("reference");

-- CreateIndex
CREATE INDEX "Article_categorie_idx" ON "Article"("categorie");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "MouvementStock_articleId_idx" ON "MouvementStock"("articleId");

-- CreateIndex
CREATE INDEX "MouvementStock_type_idx" ON "MouvementStock"("type");

-- CreateIndex
CREATE INDEX "MouvementStock_dateOperation_idx" ON "MouvementStock"("dateOperation");

-- CreateIndex
CREATE UNIQUE INDEX "Inventaire_numeroInventaire_key" ON "Inventaire"("numeroInventaire");

-- CreateIndex
CREATE INDEX "Inventaire_numeroInventaire_idx" ON "Inventaire"("numeroInventaire");

-- CreateIndex
CREATE INDEX "Inventaire_status_idx" ON "Inventaire"("status");

-- CreateIndex
CREATE INDEX "Inventaire_dateDebut_idx" ON "Inventaire"("dateDebut");

-- CreateIndex
CREATE INDEX "LigneInventaire_inventaireId_idx" ON "LigneInventaire"("inventaireId");

-- CreateIndex
CREATE INDEX "LigneInventaire_articleId_idx" ON "LigneInventaire"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_reference_key" ON "Equipement"("reference");

-- CreateIndex
CREATE INDEX "Equipement_reference_idx" ON "Equipement"("reference");

-- CreateIndex
CREATE INDEX "Equipement_status_idx" ON "Equipement"("status");

-- CreateIndex
CREATE INDEX "Equipement_categorie_idx" ON "Equipement"("categorie");

-- CreateIndex
CREATE INDEX "MaintenanceEquipement_equipementId_idx" ON "MaintenanceEquipement"("equipementId");

-- CreateIndex
CREATE INDEX "MaintenanceEquipement_status_idx" ON "MaintenanceEquipement"("status");

-- CreateIndex
CREATE INDEX "MaintenanceEquipement_type_idx" ON "MaintenanceEquipement"("type");

-- CreateIndex
CREATE INDEX "MaintenanceEquipement_dateDebut_idx" ON "MaintenanceEquipement"("dateDebut");

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEquipement" ADD CONSTRAINT "MaintenanceEquipement_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
