// Scalar allowlists mirror the Prisma schema; relation writes are never accepted.
const MODEL_FIELDS = {
  client: "id reference nom raisonSociale idu ncc rccm codeActivite typeClientId secteurActiviteId status priorite source email telephone mobile fax siteWeb chiffreAffaireAnnuel effectif dateCreationEntreprise scoreFidelite scoreRisque noteInterne datePremierContact dateDerniereInteraction dateDevenirClient dateDerniereVisite prospectId commercialId enterpriseId serviceId convertedAt createdAt updatedAt createdBy updatedBy version".split(" "),
  contact: "id clientId civilite nom prenom email emailSecondaire telephone mobile poste departement type statut principal dateNaissance notes preferencesContact createdAt updatedAt".split(" "),
  adresseClient: "id clientId typeAdresse nomAdresse ligne1 ligne2 ligne3 codePostal ville region pays isPrincipal coordonneesGps informationsAcces createdAt updatedAt".split(" "),
  contrat: "id clientId reference numeroContrat titre description typeContrat dateDebut dateFin dateSignature dateEffet montantHT montantTTC devise tauxTVA periodicitePaiement jourPaiement status motifSuspension motifResiliation estRenouvelable periodeRenouvellement dateProchainRenouvellement preavisRenouvellement documentContratId conditionsParticulieres createdAt updatedAt createdBy signataireId".split(" "),
  avenantContrat: "id contratId numeroAvenant description modifications dateEffet dateSignature montantAdditionnel createdAt updatedAt createdBy".split(" "),
  interactionClient: "id clientId contactId type canal sujet description dateInteraction dateSuivie dureeMinutes resultat actionRequise tacheLieeId createdById participants tags piecesJointes confidential createdAt updatedAt".split(" "),
  documentClient: "id clientId contratId typeDocument categorie nomFichier chemin taille mimeType description motsCles version estValide dateExpiration uploadedById dateUpload dateModification signatureDigitale confidential".split(" "),
  opportunite: "id clientId nom description montantEstime probabilite dateFermetureEstimee etape statut raisonPerdue createdById commercialId source tags createdAt updatedAt".split(" "),
  ligneProduit: "id opportuniteId produitId description quantite prixUnitaire remise tva montantHT montantTTC".split(" "),
  historiqueClient: "id clientId typeChangement entite entiteId ancienneValeur nouvelleValeur differences modifieParId modifieLe ipAddress userAgent".split(" "),
  synchronisationProspectClient: "id prospectId clientId typeSync dateSynchronisation status erreur details tentatives createdAt updatedAt".split(" "),
  tacheClient: "id clientId contactId titre description statut priorite categorie dateEcheance dateDebut dateFin assigneA createurId progression tags estRecurrente recurrence parentTaskId createdAt updatedAt".split(" "),
  typeClient: "id code libelle description couleur icone ordre isActive createdAt updatedAt createdBy updatedBy".split(" "),
  secteurActivite: "id codeActivite libelle description parentId niveau createdAt updatedAt".split(" "),
};

module.exports = { MODEL_FIELDS };
