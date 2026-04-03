-- CreateTable
CREATE TABLE "Configuration" (
    "id" SERIAL NOT NULL,
    "nomEntreprise" TEXT,
    "sigle" TEXT,
    "numeroCc" TEXT,
    "numeroCnps" TEXT,
    "adresseSiege" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "tauxCnpsSalarial" DECIMAL(12,4),
    "tauxCnpsPatronal" DECIMAL(12,4),
    "tauxIs" DECIMAL(12,4),
    "tauxCn" DECIMAL(12,4),
    "tauxFdfpApprentis" DECIMAL(12,4),
    "tauxFdfpContinu" DECIMAL(12,4),
    "smig" DECIMAL(12,2),
    "plafondCnps" DECIMAL(12,2),
    "baremesIgr" JSONB,
    "dateMiseAJour" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employe" (
    "matricule" TEXT NOT NULL,
    "civilite" TEXT,
    "nom" TEXT,
    "prenoms" TEXT,
    "nomComplet" TEXT,
    "sexe" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "nationalite" TEXT,
    "codeNationalite" TEXT,
    "situationMatrimoniale" TEXT,
    "nombreEnfants" INTEGER,
    "nombrePartsIgr" DECIMAL(5,2),
    "adressePersonnelle" TEXT,
    "telephonePersonnel" TEXT,
    "emailPersonnel" TEXT,
    "lieuHabitation" TEXT,
    "naturePieceIdentite" TEXT,
    "numeroPieceIdentite" TEXT,
    "numeroCnps" TEXT,
    "nonSoumisCnps" BOOLEAN,
    "modePaiement" TEXT,
    "rib" TEXT,
    "banque" TEXT,
    "statut" TEXT,
    "dateCreation" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3),

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("matricule")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "typeContrat" TEXT,
    "dateSignature" TIMESTAMP(3),
    "dateDebut" TIMESTAMP(3),
    "dateFinPrevue" TIMESTAMP(3),
    "dateFinReelle" TIMESTAMP(3),
    "posteOccupe" TEXT,
    "direction" TEXT,
    "service" TEXT,
    "categorieProfessionnelle" TEXT,
    "echelon" INTEGER,
    "regime" TEXT,
    "typeEmploi" TEXT,
    "salaireBaseMensuel" DECIMAL(12,2),
    "periodeEssaiMois" INTEGER,
    "dureeCddMois" INTEGER,
    "motifRecrutement" TEXT,
    "lieuTravail" TEXT,
    "statutContrat" TEXT,
    "dateCreation" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueEmploye" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "dateEvenement" TIMESTAMP(3),
    "typeMouvement" TEXT,
    "ancienPoste" TEXT,
    "nouveauPoste" TEXT,
    "ancienSalaire" DECIMAL(12,2),
    "nouveauSalaire" DECIMAL(12,2),
    "motif" TEXT,
    "observations" TEXT,

    CONSTRAINT "HistoriqueEmploye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariablesMensuelle" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "periode" TEXT,
    "heuresSupp15" DECIMAL(8,2),
    "heuresSupp50" DECIMAL(8,2),
    "heuresSupp75" DECIMAL(8,2),
    "heuresSupp100" DECIMAL(8,2),
    "primeRendement" DECIMAL(12,2),
    "primeTransport" DECIMAL(12,2),
    "primeSalissure" DECIMAL(12,2),
    "primeAnciennete" DECIMAL(12,2),
    "primesDiverses" DECIMAL(12,2),
    "gratificationMensuelle" DECIMAL(12,2),
    "indemniteLogement" DECIMAL(12,2),
    "indemniteRepas" DECIMAL(12,2),
    "joursAbsenceInjustifiee" INTEGER,
    "joursCongesPris" INTEGER,
    "joursMaladie" INTEGER,
    "joursMaternite" INTEGER,
    "retenuePret" DECIMAL(12,2),
    "retenueAutre" DECIMAL(12,2),
    "dateSaisie" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT,

    CONSTRAINT "VariablesMensuelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPaie" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "periode" TEXT,
    "salaireBase" DECIMAL(12,2),
    "heuresSuppMontant" DECIMAL(12,2),
    "primesTotal" DECIMAL(12,2),
    "salaireBrut" DECIMAL(12,2),
    "cotisationCnpsSalariale" DECIMAL(12,2),
    "cotisationCnpsPatronale" DECIMAL(12,2),
    "impotIs" DECIMAL(12,2),
    "impotCn" DECIMAL(12,2),
    "impotIgr" DECIMAL(12,2),
    "totalRetenues" DECIMAL(12,2),
    "salaireNet" DECIMAL(12,2),
    "coutTotalEmployeur" DECIMAL(12,2),
    "statutPaiement" TEXT,
    "datePaiement" TIMESTAMP(3),
    "referenceVirement" TEXT,
    "dateGeneration" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "variablesMensuelleId" INTEGER,

    CONSTRAINT "BulletinPaie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CumulAnnuel" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "annee" INTEGER,
    "cumulBrut" DECIMAL(12,2),
    "cumulNet" DECIMAL(12,2),
    "cumulCnps" DECIMAL(12,2),
    "cumulImpots" DECIMAL(12,2),
    "cumulCongesAcquis" INTEGER,
    "cumulCongesConsommes" INTEGER,
    "cumulHeuresSupp" DECIMAL(12,2),

    CONSTRAINT "CumulAnnuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GestionConge" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "typeConge" TEXT,
    "nombreJours" INTEGER,
    "allocationCongePayee" DECIMAL(12,2),
    "statut" TEXT,
    "dateDemande" TIMESTAMP(3),
    "dateApprobation" TIMESTAMP(3),
    "observations" TEXT,

    CONSTRAINT "GestionConge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisionCongeCalc" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "periode" TEXT,
    "droitCongeAcquisMois" DECIMAL(6,2),
    "droitCongeCumule" DECIMAL(6,2),
    "droitCongeConsomme" DECIMAL(6,2),
    "droitCongeRestant" DECIMAL(6,2),
    "montantProvision" DECIMAL(12,2),
    "tauxJournalier" DECIMAL(12,2),

    CONSTRAINT "ProvisionCongeCalc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "dateAbsence" TIMESTAMP(3),
    "typeAbsence" TEXT,
    "nombreJours" INTEGER,
    "justification" TEXT,
    "retenueSalaire" DECIMAL(12,2),

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PretAvance" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "datePret" TIMESTAMP(3),
    "montantTotalPrete" DECIMAL(12,2),
    "montantRestantDu" DECIMAL(12,2),
    "nombreMoisRemboursement" INTEGER,
    "mensualiteRetenue" DECIMAL(12,2),
    "dateDebutRemboursement" TIMESTAMP(3),
    "dateFinRemboursement" TIMESTAMP(3),
    "nombreMoisPayes" INTEGER,
    "statut" TEXT,
    "motifPret" TEXT,

    CONSTRAINT "PretAvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuptureContrat" (
    "id" SERIAL NOT NULL,
    "contratId" INTEGER NOT NULL,
    "matricule" TEXT NOT NULL,
    "dateRupture" TIMESTAMP(3),
    "motifRupture" TEXT,
    "indemnitePreavis" DECIMAL(12,2),
    "indemniteLicenciement" DECIMAL(12,2),
    "indemniteCongesPayes" DECIMAL(12,2),
    "indemniteFinCarriere" DECIMAL(12,2),
    "montantTotalDu" DECIMAL(12,2),
    "dateRemiseCertificat" TIMESTAMP(3),
    "observations" TEXT,

    CONSTRAINT "RuptureContrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificatTravail" (
    "id" SERIAL NOT NULL,
    "ruptureId" INTEGER NOT NULL,
    "matricule" TEXT NOT NULL,
    "dateEntree" TIMESTAMP(3),
    "dateSortie" TIMESTAMP(3),
    "postesOccupes" TEXT,
    "dateEmission" TIMESTAMP(3),
    "signatureAutorite" TEXT,

    CONSTRAINT "CertificatTravail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gratification" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "periode" TEXT,
    "typeGratification" TEXT,
    "baseCalcul" DECIMAL(12,2),
    "tauxGratification" DECIMAL(6,2),
    "montantBrut" DECIMAL(12,2),
    "retenues" DECIMAL(12,2),
    "montantNet" DECIMAL(12,2),
    "dateVersement" TIMESTAMP(3),

    CONSTRAINT "Gratification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndemniteRupture" (
    "id" SERIAL NOT NULL,
    "ruptureId" INTEGER NOT NULL,
    "matricule" TEXT NOT NULL,
    "indemnitePreavisMontant" DECIMAL(12,2),
    "indemnitePreavisJours" INTEGER,
    "indemniteLicenciementMontant" DECIMAL(12,2),
    "indemniteLicenciementMois" INTEGER,
    "indemniteCongesJours" INTEGER,
    "indemniteCongesMontant" DECIMAL(12,2),
    "totalIndemnites" DECIMAL(12,2),

    CONSTRAINT "IndemniteRupture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeclarationCnps" (
    "id" SERIAL NOT NULL,
    "periode" TEXT,
    "typeDeclaration" TEXT,
    "matricule" TEXT NOT NULL,
    "salaireSoumisCnps" DECIMAL(12,2),
    "partSalariale" DECIMAL(12,2),
    "partPatronale" DECIMAL(12,2),
    "totalCotisation" DECIMAL(12,2),
    "dateEnvoi" TIMESTAMP(3),
    "statutDeclaration" TEXT,

    CONSTRAINT "DeclarationCnps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeclarationFiscale" (
    "id" SERIAL NOT NULL,
    "periode" TEXT,
    "typeDeclaration" TEXT,
    "matricule" TEXT NOT NULL,
    "salaireImposable" DECIMAL(12,2),
    "montantIs" DECIMAL(12,2),
    "montantCn" DECIMAL(12,2),
    "montantIgr" DECIMAL(12,2),
    "totalImpots" DECIMAL(12,2),
    "dateDeclaration" TIMESTAMP(3),
    "statut" TEXT,

    CONSTRAINT "DeclarationFiscale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disa" (
    "id" SERIAL NOT NULL,
    "annee" INTEGER,
    "matricule" TEXT NOT NULL,
    "nombreMoisPresence" INTEGER,
    "salaireAnnuel" DECIMAL(12,2),
    "cotisationsAnnuelles" DECIMAL(12,2),
    "impotsAnnuels" DECIMAL(12,2),
    "dateDeclaration" TIMESTAMP(3),

    CONSTRAINT "Disa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dasc" (
    "id" SERIAL NOT NULL,
    "annee" INTEGER,
    "matricule" TEXT NOT NULL,
    "accidentsTravail" INTEGER,
    "prestationsFamiliales" DECIMAL(12,2),
    "indemnitesJournalieres" DECIMAL(12,2),
    "dateDeclaration" TIMESTAMP(3),

    CONSTRAINT "Dasc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etat301" (
    "id" SERIAL NOT NULL,
    "annee" INTEGER,
    "matricule" TEXT NOT NULL,
    "salaireAnnuel" DECIMAL(12,2),
    "impotAnnuel" DECIMAL(12,2),
    "regularisation" DECIMAL(12,2),
    "dateDeclaration" TIMESTAMP(3),

    CONSTRAINT "Etat301_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcritureComptable" (
    "id" SERIAL NOT NULL,
    "dateEcriture" TIMESTAMP(3),
    "periode" TEXT,
    "compteDebit" TEXT,
    "compteCredit" TEXT,
    "libelleOperation" TEXT,
    "montant" DECIMAL(12,2),
    "journal" TEXT,
    "referencePiece" TEXT,
    "statut" TEXT,
    "bulletinId" INTEGER,

    CONSTRAINT "EcritureComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisionRetraiteCalc" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT NOT NULL,
    "periode" TEXT,
    "indemniteFinCarriereEstimee" DECIMAL(12,2),
    "provisionCumulee" DECIMAL(12,2),
    "tauxProvision" DECIMAL(6,2),
    "dateCalcul" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProvisionRetraiteCalc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivrePaieMensuel" (
    "id" SERIAL NOT NULL,
    "periode" TEXT,
    "nombreEmployes" INTEGER,
    "totalSalaireBrut" DECIMAL(12,2),
    "totalCotisationCnpsSalariale" DECIMAL(12,2),
    "totalCotisationCnpsPatronale" DECIMAL(12,2),
    "totalImpotsIs" DECIMAL(12,2),
    "totalImpotsCn" DECIMAL(12,2),
    "totalImpotsIgr" DECIMAL(12,2),
    "totalRetenues" DECIMAL(12,2),
    "totalSalaireNet" DECIMAL(12,2),
    "totalChargesPatronales" DECIMAL(12,2),
    "coutTotalEmployeur" DECIMAL(12,2),
    "dateGeneration" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivrePaieMensuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivrePaieAnnuel" (
    "id" SERIAL NOT NULL,
    "annee" INTEGER,
    "nombreEmployesMoyen" DECIMAL(6,1),
    "totalGainsAnnuels" DECIMAL(12,2),
    "totalChargesPatronalesAnnuelles" DECIMAL(12,2),
    "coutTotalAnnuel" DECIMAL(12,2),
    "masseSalarialeMoyenne" DECIMAL(12,2),

    CONSTRAINT "LivrePaieAnnuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdreBancaire" (
    "id" SERIAL NOT NULL,
    "periode" TEXT,
    "dateVirement" TIMESTAMP(3),
    "banqueEmetteur" TEXT,
    "nombreBeneficiaires" INTEGER,
    "montantTotalLot" DECIMAL(12,2),
    "statut" TEXT,
    "referenceVirement" TEXT,

    CONSTRAINT "OrdreBancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailVirement" (
    "id" SERIAL NOT NULL,
    "ordreId" INTEGER NOT NULL,
    "matricule" TEXT NOT NULL,
    "ribBeneficiaire" TEXT,
    "montantNet" DECIMAL(12,2),
    "dateExecution" TIMESTAMP(3),

    CONSTRAINT "DetailVirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatistiqueRh" (
    "id" SERIAL NOT NULL,
    "periode" TEXT,
    "effectifDebutPeriode" INTEGER,
    "effectifFinPeriode" INTEGER,
    "effectifMoyen" DECIMAL(6,1),
    "embauches" INTEGER,
    "departs" INTEGER,
    "tauxAbsenteisme" DECIMAL(6,2),
    "tauxTurnover" DECIMAL(6,2),
    "ancienneteMoyenne" DECIMAL(6,1),
    "masseSalarialeTotale" DECIMAL(12,2),
    "coutMoyenEmploye" DECIMAL(12,2),
    "coutChargesSociales" DECIMAL(12,2),

    CONSTRAINT "StatistiqueRh_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueEmploye" ADD CONSTRAINT "HistoriqueEmploye_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariablesMensuelle" ADD CONSTRAINT "VariablesMensuelle_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_variablesMensuelleId_fkey" FOREIGN KEY ("variablesMensuelleId") REFERENCES "VariablesMensuelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CumulAnnuel" ADD CONSTRAINT "CumulAnnuel_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestionConge" ADD CONSTRAINT "GestionConge_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisionCongeCalc" ADD CONSTRAINT "ProvisionCongeCalc_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PretAvance" ADD CONSTRAINT "PretAvance_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuptureContrat" ADD CONSTRAINT "RuptureContrat_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuptureContrat" ADD CONSTRAINT "RuptureContrat_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatTravail" ADD CONSTRAINT "CertificatTravail_ruptureId_fkey" FOREIGN KEY ("ruptureId") REFERENCES "RuptureContrat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificatTravail" ADD CONSTRAINT "CertificatTravail_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gratification" ADD CONSTRAINT "Gratification_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndemniteRupture" ADD CONSTRAINT "IndemniteRupture_ruptureId_fkey" FOREIGN KEY ("ruptureId") REFERENCES "RuptureContrat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndemniteRupture" ADD CONSTRAINT "IndemniteRupture_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeclarationCnps" ADD CONSTRAINT "DeclarationCnps_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeclarationFiscale" ADD CONSTRAINT "DeclarationFiscale_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disa" ADD CONSTRAINT "Disa_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dasc" ADD CONSTRAINT "Dasc_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etat301" ADD CONSTRAINT "Etat301_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcritureComptable" ADD CONSTRAINT "EcritureComptable_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "BulletinPaie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisionRetraiteCalc" ADD CONSTRAINT "ProvisionRetraiteCalc_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailVirement" ADD CONSTRAINT "DetailVirement_ordreId_fkey" FOREIGN KEY ("ordreId") REFERENCES "OrdreBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailVirement" ADD CONSTRAINT "DetailVirement_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "Employe"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;
