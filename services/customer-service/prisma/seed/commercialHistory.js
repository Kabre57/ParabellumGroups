/** Ajoute les interactions, opportunit?s et lignes de produit de d?monstration. */
async function seedCommercialHistory(prisma, { clients, contacts }) {
  // Créer les interactions
  console.log('💬 Création des interactions...');
  const interactions = await Promise.all([
    // Interactions pour TechnoSoft Solutions
    prisma.interactionClient.create({
      data: {
        clientId: clients[0].id,
        contactId: contacts[0].id,
        type: 'REUNION',
        canal: 'EN_PERSONNE',
        sujet: 'Présentation des nouveaux services',
        description: 'Réunion de présentation des nouveaux services de cloud',
        dateInteraction: new Date('2024-01-15T10:00:00'),
        dureeMinutes: 90,
        resultat: 'POSITIF',
        actionRequise: 'Envoyer le devis dans les 48h',
        createdById: 'commercial-user-id',
        participants: ['commercial-user-id', 'manager-user-id'],
        tags: ['présentation', 'nouveaux-services', 'cloud'],
        confidential: false
      }
    }),
    prisma.interactionClient.create({
      data: {
        clientId: clients[0].id,
        contactId: contacts[1].id,
        type: 'APPEL',
        canal: 'TELEPHONE',
        sujet: 'Support technique - Problème serveur',
        description: 'Résolution d\'un problème de serveur de production',
        dateInteraction: new Date('2024-01-20T14:30:00'),
        dureeMinutes: 45,
        resultat: 'TERMINE',
        actionRequise: 'Suivre dans 48h',
        createdById: 'support-user-id',
        tags: ['support', 'technique', 'serveur'],
        confidential: true
      }
    }),
    // Interaction pour Martin Dubois
    prisma.interactionClient.create({
      data: {
        clientId: clients[1].id,
        contactId: contacts[2].id,
        type: 'EMAIL',
        canal: 'EMAIL',
        sujet: 'Confirmation de formation',
        description: 'Email de confirmation des dates de formation',
        dateInteraction: new Date('2024-01-22T09:15:00'),
        resultat: 'POSITIF',
        createdById: 'commercial-user-id',
        tags: ['formation', 'confirmation'],
        confidential: false
      }
    })
  ]);
  console.log(`✅ ${interactions.length} interactions créées`);

  // Créer les opportunités
  console.log('🎯 Création des opportunités...');
  const opportunites = await Promise.all([
    // Opportunité pour Green Earth Association
    prisma.opportunite.create({
      data: {
        clientId: clients[2].id,
        nom: 'Site web et CRM pour association',
        description: 'Développement d\'un site web avec système de gestion des adhérents',
        montantEstime: 15000,
        probabilite: 70,
        dateFermetureEstimee: new Date('2024-03-15'),
        etape: 'PROPOSITION',
        statut: 'OUVERTE',
        source: 'SALON',
        commercialId: 'commercial-user-id',
        createdById: 'system'
      }
    }),
    // Opportunité pour Innovatech Industries
    prisma.opportunite.create({
      data: {
        clientId: clients[3].id,
        nom: 'Migration vers le cloud',
        description: 'Migration complète de l\'infrastructure vers Azure',
        montantEstime: 75000,
        probabilite: 85,
        dateFermetureEstimee: new Date('2024-02-28'),
        etape: 'NEGOCIATION',
        statut: 'OUVERTE',
        source: 'APPEL_ENTRANT',
        commercialId: 'admin-user-id',
        createdById: 'system'
      }
    })
  ]);
  console.log(`✅ ${opportunites.length} opportunités créées`);

  // Créer les lignes de produit pour les opportunités
  console.log('📦 Création des lignes de produit...');
  const lignesProduit = await Promise.all([
    // Lignes pour l'opportunité Green Earth
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[0].id,
        description: 'Développement site web responsive',
        quantite: 1,
        prixUnitaire: 8000,
        tva: 20,
        montantHT: 8000,
        montantTTC: 9600
      }
    }),
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[0].id,
        description: 'Module de gestion des adhérents',
        quantite: 1,
        prixUnitaire: 4000,
        tva: 20,
        montantHT: 4000,
        montantTTC: 4800
      }
    }),
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[0].id,
        description: 'Formation administrateurs',
        quantite: 1,
        prixUnitaire: 600,
        tva: 20,
        montantHT: 600,
        montantTTC: 720
      }
    }),
    // Lignes pour l'opportunité Innovatech
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[1].id,
        description: 'Audit de l\'infrastructure existante',
        quantite: 1,
        prixUnitaire: 15000,
        tva: 20,
        montantHT: 15000,
        montantTTC: 18000
      }
    }),
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[1].id,
        description: 'Migration des serveurs vers Azure',
        quantite: 10,
        prixUnitaire: 3000,
        tva: 20,
        montantHT: 30000,
        montantTTC: 36000
      }
    }),
    prisma.ligneProduit.create({
      data: {
        opportuniteId: opportunites[1].id,
        description: 'Formation équipe technique',
        quantite: 3,
        prixUnitaire: 2000,
        tva: 20,
        montantHT: 6000,
        montantTTC: 7200
      }
    })
  ]);
  console.log(`✅ ${lignesProduit.length} lignes de produit créées`);
}

module.exports = { seedCommercialHistory };
