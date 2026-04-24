-- CreateTable
CREATE TABLE "specialites" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "techniciens" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "specialiteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "matricule" TEXT NOT NULL,
    "dateEmbauche" TIMESTAMP(3) NOT NULL,
    "tauxHoraire" DOUBLE PRECISION,
    "competences" TEXT[],
    "certifications" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "techniciens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "numeroMission" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "clientNom" TEXT NOT NULL,
    "clientContact" TEXT,
    "adresse" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "priorite" TEXT NOT NULL DEFAULT 'MOYENNE',
    "budgetEstime" DOUBLE PRECISION,
    "coutReel" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions_techniciens" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "role" TEXT,
    "dateAssignation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_techniciens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "dureeEstimee" DOUBLE PRECISION,
    "dureeReelle" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "resultats" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions_techniciens" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "dateAssignation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interventions_techniciens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiel" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL,
    "quantiteStock" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 10,
    "seuilRupture" INTEGER NOT NULL DEFAULT 5,
    "prixUnitaire" DOUBLE PRECISION,
    "fournisseur" TEXT,
    "emplacementStock" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sorties_materiel" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "dateSortie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRetour" TIMESTAMP(3),
    "etatRetour" TEXT,
    "notes" TEXT,

    CONSTRAINT "sorties_materiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapports" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "redacteurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "conclusions" TEXT,
    "recommandations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "dateValidation" TIMESTAMP(3),

    CONSTRAINT "rapports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialites_nom_key" ON "specialites"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "techniciens_email_key" ON "techniciens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "techniciens_matricule_key" ON "techniciens"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "missions_numeroMission_key" ON "missions"("numeroMission");

-- CreateIndex
CREATE UNIQUE INDEX "missions_techniciens_missionId_technicienId_key" ON "missions_techniciens"("missionId", "technicienId");

-- CreateIndex
CREATE UNIQUE INDEX "interventions_techniciens_interventionId_technicienId_key" ON "interventions_techniciens"("interventionId", "technicienId");

-- CreateIndex
CREATE UNIQUE INDEX "materiel_reference_key" ON "materiel"("reference");

-- AddForeignKey
ALTER TABLE "techniciens" ADD CONSTRAINT "techniciens_specialiteId_fkey" FOREIGN KEY ("specialiteId") REFERENCES "specialites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_techniciens" ADD CONSTRAINT "missions_techniciens_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions_techniciens" ADD CONSTRAINT "missions_techniciens_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions_techniciens" ADD CONSTRAINT "interventions_techniciens_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions_techniciens" ADD CONSTRAINT "interventions_techniciens_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorties_materiel" ADD CONSTRAINT "sorties_materiel_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorties_materiel" ADD CONSTRAINT "sorties_materiel_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorties_materiel" ADD CONSTRAINT "sorties_materiel_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "interventions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapports" ADD CONSTRAINT "rapports_redacteurId_fkey" FOREIGN KEY ("redacteurId") REFERENCES "techniciens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
