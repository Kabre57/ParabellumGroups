/** Ajoute les documents, notes, t?ches, pr?f?rences, tags et mappings. */
async function seedCustomerRecords(prisma, { clients, contacts, contrats }) {
  // Créer les documents
  console.log('📎 Création des documents...');
  const documents = await Promise.all([
    // Document pour TechnoSoft Solutions
    prisma.documentClient.create({
      data: {
        clientId: clients[0].id,
        contratId: contrats[0].id,
        typeDocument: 'CONTRAT',
        nomFichier: 'contrat_maintenance_2024.pdf',
        chemin: '/documents/clients/technosoft/contrats/contrat_maintenance_2024.pdf',
        taille: 2457600,
        mimeType: 'application/pdf',
        description: 'Contrat de maintenance annuelle 2024',
        motsCles: ['contrat', 'maintenance', '2024'],
        version: '1.0',
        estValide: true,
        uploadedById: 'system',
        dateUpload: new Date('2023-12-15'),
        confidential: false
      }
    }),
    // Document pour Martin Dubois
    prisma.documentClient.create({
      data: {
        clientId: clients[1].id,
        typeDocument: 'DEVIS',
        nomFichier: 'devis_formation_excel.pdf',
        chemin: '/documents/clients/dubois/devis/devis_formation_excel.pdf',
        taille: 1024000,
        mimeType: 'application/pdf',
        description: 'Devis pour formation Excel avancé',
        motsCles: ['devis', 'formation', 'excel'],
        version: '1.0',
        estValide: true,
        uploadedById: 'system',
        dateUpload: new Date('2024-01-20'),
        confidential: false
      }
    })
  ]);
  console.log(`✅ ${documents.length} documents créés`);

  // Créer les notes
  console.log('📝 Création des notes...');
  const notes = await Promise.all([
    // Note pour TechnoSoft Solutions
    prisma.noteClient.create({
      data: {
        clientId: clients[0].id,
        contactId: contacts[0].id,
        titre: 'Information importante',
        contenu: 'Le client a mentionné une expansion internationale prévue pour Q3 2024. À suivre pour opportunités additionnelles.',
        typeNote: 'INTERNE',
        estPrivee: false,
        priorite: 'NORMALE',
        createdById: 'commercial-user-id'
      }
    }),
    // Note pour Innovatech Industries
    prisma.noteClient.create({
      data: {
        clientId: clients[3].id,
        titre: 'Contact avec le service financier',
        contenu: 'Le service financier demande un délai de paiement à 60 jours. À négocier.',
        typeNote: 'INTERNE',
        estPrivee: true,
        priorite: 'ELEVEE',
        createdById: 'admin-user-id'
      }
    })
  ]);
  console.log(`✅ ${notes.length} notes créées`);

  // Créer les tâches
  console.log('✅ Création des tâches...');
  const taches = await Promise.all([
    // Tâche pour TechnoSoft Solutions
    prisma.tacheClient.create({
      data: {
        clientId: clients[0].id,
        contactId: contacts[0].id,
        titre: 'Envoyer le rapport trimestriel',
        description: 'Préparer et envoyer le rapport de performance du trimestre',
        statut: 'A_FAIRE',
        priorite: 'NORMALE',
        categorie: 'COMMERCIAL',
        dateEcheance: new Date('2024-02-15'),
        assigneA: 'commercial-user-id',
        createurId: 'manager-user-id',
        progression: 0
      }
    }),
    // Tâche pour Green Earth Association
    prisma.tacheClient.create({
      data: {
        clientId: clients[2].id,
        contactId: contacts[3].id,
        titre: 'Préparer la proposition finale',
        description: 'Finaliser la proposition commerciale avec tous les détails',
        statut: 'EN_COURS',
        priorite: 'HAUTE',
        categorie: 'COMMERCIAL',
        dateEcheance: new Date('2024-02-05'),
        assigneA: 'commercial-user-id',
        createurId: 'commercial-user-id',
        progression: 60
      }
    })
  ]);
  console.log(`✅ ${taches.length} tâches créées`);

  // Créer les préférences clients
  console.log('⚙️  Création des préférences clients...');
  const preferences = await Promise.all([
    prisma.preferenceClient.create({
      data: {
        clientId: clients[0].id,
        langue: 'fr',
        fuseauHoraire: 'Africa/Abidjan',
        formatDate: 'DD/MM/YYYY',
        devise: 'XOF',
        accepteMarketing: true,
        accepteNewsletter: true,
        modeCommunicationPrefere: 'EMAIL',
        rgpdAccepteLe: new Date('2023-04-01'),
        rgpdMiseAJourLe: new Date('2024-01-01'),
        categoriesDonneesConsenties: ['contact', 'facturation', 'support']
      }
    }),
    prisma.preferenceClient.create({
      data: {
        clientId: clients[1].id,
        langue: 'fr',
        fuseauHoraire: 'Africa/Abidjan',
        formatDate: 'DD/MM/YYYY',
        devise: 'XOF',
        accepteMarketing: false,
        accepteNewsletter: true,
        modeCommunicationPrefere: 'TELEPHONE',
        rgpdAccepteLe: new Date('2023-07-01')
      }
    })
  ]);
  console.log(`✅ ${preferences.length} préférences créées`);

  // Créer les tags clients
  console.log('🏷️  Création des tags clients...');
  const tags = await Promise.all([
    // Tags pour TechnoSoft Solutions
    prisma.tagClient.create({
      data: {
        clientId: clients[0].id,
        tag: 'Grand compte',
        categorie: 'STATUT',
        couleur: '#3B82F6'
      }
    }),
    prisma.tagClient.create({
      data: {
        clientId: clients[0].id,
        tag: 'Fidèle',
        categorie: 'COMPORTEMENT',
        couleur: '#10B981'
      }
    }),
    // Tags pour Innovatech Industries
    prisma.tagClient.create({
      data: {
        clientId: clients[3].id,
        tag: 'Lead chaud',
        categorie: 'STATUT',
        couleur: '#EF4444'
      }
    }),
    prisma.tagClient.create({
      data: {
        clientId: clients[3].id,
        tag: 'Projet important',
        categorie: 'COMPORTEMENT',
        couleur: '#F59E0B'
      }
    })
  ]);
  console.log(`✅ ${tags.length} tags créés`);

  // Créer les mapping de statuts
  console.log('🔄 Création des mappings de statuts...');
  const mappings = await Promise.all([
    prisma.mappingStatus.create({
      data: {
        serviceSource: 'COMMERCIAL',
        statusSource: 'PREPARATION',
        serviceCible: 'CRM',
        statusCible: 'PROSPECT',
        priorite: 1,
        actif: true
      }
    }),
    prisma.mappingStatus.create({
      data: {
        serviceSource: 'COMMERCIAL',
        statusSource: 'GAGNE',
        serviceCible: 'CRM',
        statusCible: 'ACTIF',
        priorite: 1,
        actif: true
      }
    }),
    prisma.mappingStatus.create({
      data: {
        serviceSource: 'CRM',
        statusSource: 'ACTIF',
        serviceCible: 'COMMERCIAL',
        statusCible: 'GAGNE',
        priorite: 1,
        actif: true
      }
    })
  ]);
}

module.exports = { seedCustomerRecords };
