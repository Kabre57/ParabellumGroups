const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Nettoyer la base de données (attention en production!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Nettoyage de la base de données...');
    
    // Désactiver les contraintes de clé étrangère temporairement
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;
    
    // Supprimer les données dans le bon ordre
    const models = [
      'SynchronisationProspectClient',
      'HistoriqueClient',
      'TagClient',
      'AbonnementClient',
      'PreferenceClient',
      'LigneFacture',
      'Facture',
      'LigneProduit',
      'Opportunite',
      'TacheClient',
      'NoteClient',
      'DocumentClient',
      'InteractionClient',
      'AdresseClient',
      'AvenantContrat',
      'Contrat',
      'Contact',
      'Client',
      'SecteurActivite',
      'TypeClient',
      'MappingStatus'
    ];

    for (const model of models) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${prisma._getTableName(model)}" CASCADE;`);
        console.log(`✅ Table ${model} nettoyée`);
      } catch (error) {
        console.log(`⚠️  Impossible de nettoyer ${model}: ${error.message}`);
      }
    }

    // Réactiver les contraintes
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;
  }

  // Créer les types de clients
  console.log('📋 Création des types de clients...');
  const typeClients = await Promise.all([
    prisma.typeClient.create({
      data: {
        code: 'ENTREPRISE',
        libelle: 'Entreprise',
        description: 'Clients professionnels (PME, Grands Comptes)',
        couleur: '#3B82F6',
        icone: '🏢',
        ordre: 1,
        isActive: true
      }
    }),
    prisma.typeClient.create({
      data: {
        code: 'PARTICULIER',
        libelle: 'Particulier',
        description: 'Clients individuels',
        couleur: '#10B981',
        icone: '👤',
        ordre: 2,
        isActive: true
      }
    }),
    prisma.typeClient.create({
      data: {
        code: 'ASSOCIATION',
        libelle: 'Association',
        description: 'Associations et organisations à but non lucratif',
        couleur: '#8B5CF6',
        icone: '🤝',
        ordre: 3,
        isActive: true
      }
    }),
    prisma.typeClient.create({
      data: {
        code: 'ADMINISTRATION',
        libelle: 'Administration',
        description: 'Services publics et administrations',
        couleur: '#F59E0B',
        icone: '🏛️',
        ordre: 4,
        isActive: true
      }
    })
  ]);
  console.log(`✅ ${typeClients.length} types de clients créés`);

  // Créer les secteurs d'activité
  console.log('🏭 Création des secteurs d\'activité...');
  const secteurs = await Promise.all([
    prisma.secteurActivite.create({
      data: {
        codeNAF: '62.01Z',
        libelle: 'Programmation informatique',
        description: 'Conception de logiciels et applications',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeNAF: '62.02A',
        libelle: 'Conseil en systèmes informatiques',
        description: 'Conseil et assistance en informatique',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeNAF: '46.51Z',
        libelle: 'Commerce de gros d\'ordinateurs',
        description: 'Commerce de gros de matériel informatique',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeNAF: '70.22Z',
        libelle: 'Conseil pour les affaires',
        description: 'Conseil en gestion et management',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeNAF: '82.30Z',
        libelle: 'Centres d\'appels',
        description: 'Services de centres d\'appels et relation client',
        niveau: 1
      }
    })
  ]);
  console.log(`✅ ${secteurs.length} secteurs d'activité créés`);

  // Créer les clients de démonstration
  console.log('👥 Création des clients de démonstration...');
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        reference: 'CLI-202401-0001',
        nom: 'TechnoSoft Solutions',
        raisonSociale: 'TechnoSoft Solutions SAS',
        email: 'contact@technosoft.fr',
        telephone: '0123456789',
        mobile: '0612345678',
        siteWeb: 'https://www.technosoft.fr',
        siret: '12345678901234',
        tvaIntra: 'FR12345678901',
        typeClientId: typeClients[0].id,
        secteurActiviteId: secteurs[0].id,
        status: 'ACTIF',
        priorite: 'HAUTE',
        source: 'RECOMMANDATION',
        chiffreAffaireAnnuel: 2500000,
        effectif: 45,
        commercialId: 'admin-user-id',
        scoreFidelite: 85,
        datePremierContact: new Date('2023-03-15'),
        dateDevenirClient: new Date('2023-04-01'),
        dateDerniereInteraction: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      }
    }),
    prisma.client.create({
      data: {
        reference: 'CLI-202401-0002',
        nom: 'Martin Dubois',
        email: 'martin.dubois@email.com',
        telephone: '0234567891',
        mobile: '0623456789',
        typeClientId: typeClients[1].id,
        status: 'ACTIF',
        priorite: 'MOYENNE',
        source: 'SITE_WEB',
        commercialId: 'manager-user-id',
        scoreFidelite: 72,
        datePremierContact: new Date('2023-06-10'),
        dateDevenirClient: new Date('2023-07-01'),
        dateDerniereInteraction: new Date('2024-01-15'),
        createdBy: 'system',
        updatedBy: 'system'
      }
    }),
    prisma.client.create({
      data: {
        reference: 'CLI-202401-0003',
        nom: 'Green Earth Association',
        raisonSociale: 'Association Green Earth',
        email: 'info@greenearth.org',
        telephone: '0345678912',
        siteWeb: 'https://www.greenearth.org',
        typeClientId: typeClients[2].id,
        secteurActiviteId: secteurs[3].id,
        status: 'PROSPECT',
        priorite: 'BASSE',
        source: 'SALON',
        effectif: 12,
        commercialId: 'commercial-user-id',
        datePremierContact: new Date('2024-01-10'),
        createdBy: 'system',
        updatedBy: 'system'
      }
    }),
    prisma.client.create({
      data: {
        reference: 'CLI-202401-0004',
        nom: 'Innovatech Industries',
        raisonSociale: 'Innovatech Industries SA',
        email: 'contact@innovatech.com',
        telephone: '0456789123',
        mobile: '0634567891',
        siteWeb: 'https://www.innovatech.com',
        siret: '98765432109876',
        tvaIntra: 'FR98765432109',
        typeClientId: typeClients[0].id,
        secteurActiviteId: secteurs[1].id,
        status: 'LEAD_CHAUD',
        priorite: 'CRITIQUE',
        source: 'APPEL_ENTRANT',
        chiffreAffaireAnnuel: 5000000,
        effectif: 120,
        commercialId: 'admin-user-id',
        datePremierContact: new Date('2024-01-20'),
        createdBy: 'system',
        updatedBy: 'system'
      }
    })
  ]);
  console.log(`✅ ${clients.length} clients créés`);

  // Créer les contacts
  console.log('📇 Création des contacts...');
  const contacts = await Promise.all([
    // Contacts pour TechnoSoft Solutions
    prisma.contact.create({
      data: {
        clientId: clients[0].id,
        civilite: 'M.',
        nom: 'Leroy',
        prenom: 'Philippe',
        email: 'philippe.leroy@technosoft.fr',
        telephone: '0123456789',
        mobile: '0612345678',
        poste: 'Directeur Général',
        departement: 'Direction',
        type: 'DIRECTION',
        statut: 'ACTIF',
        principal: true
      }
    }),
    prisma.contact.create({
      data: {
        clientId: clients[0].id,
        civilite: 'Mme',
        nom: 'Moreau',
        prenom: 'Sophie',
        email: 'sophie.moreau@technosoft.fr',
        telephone: '0123456790',
        poste: 'Responsable IT',
        departement: 'Informatique',
        type: 'TECHNIQUE',
        statut: 'ACTIF',
        principal: false
      }
    }),
    // Contact pour Martin Dubois
    prisma.contact.create({
      data: {
        clientId: clients[1].id,
        civilite: 'M.',
        nom: 'Dubois',
        prenom: 'Martin',
        email: 'martin.dubois@email.com',
        telephone: '0234567891',
        mobile: '0623456789',
        type: 'COMMERCIAL',
        statut: 'ACTIF',
        principal: true
      }
    }),
    // Contact pour Green Earth Association
    prisma.contact.create({
      data: {
        clientId: clients[2].id,
        civilite: 'Mme',
        nom: 'Petit',
        prenom: 'Marie',
        email: 'marie.petit@greenearth.org',
        telephone: '0345678912',
        poste: 'Présidente',
        departement: 'Direction',
        type: 'DIRECTION',
        statut: 'ACTIF',
        principal: true
      }
    }),
    // Contact pour Innovatech Industries
    prisma.contact.create({
      data: {
        clientId: clients[3].id,
        civilite: 'M.',
        nom: 'Rousseau',
        prenom: 'Thomas',
        email: 'thomas.rousseau@innovatech.com',
        telephone: '0456789123',
        mobile: '0634567891',
        poste: 'Directeur Commercial',
        departement: 'Commercial',
        type: 'COMMERCIAL',
        statut: 'ACTIF',
        principal: true
      }
    })
  ]);
  console.log(`✅ ${contacts.length} contacts créés`);

  // Créer les adresses
  console.log('🏠 Création des adresses...');
  const adresses = await Promise.all([
    // Adresses pour TechnoSoft Solutions
    prisma.adresseClient.create({
      data: {
        clientId: clients[0].id,
        typeAdresse: 'SIEGE_SOCIAL',
        nomAdresse: 'Siège social',
        ligne1: '12 Rue de la Technologie',
        codePostal: '75015',
        ville: 'Paris',
        pays: '""',
        isPrincipal: true
      }
    }),
    prisma.adresseClient.create({
      data: {
        clientId: clients[0].id,
        typeAdresse: 'FACTURATION',
        nomAdresse: 'Service comptabilité',
        ligne1: '12 Rue de la Technologie',
        codePostal: '75015',
        ville: 'Paris',
        pays: '""',
        isPrincipal: false
      }
    }),
    // Adresse pour Martin Dubois
    prisma.adresseClient.create({
      data: {
        clientId: clients[1].id,
        typeAdresse: 'FACTURATION',
        ligne1: '45 Avenue des Champs-Élysées',
        codePostal: '75008',
        ville: 'Paris',
        pays: '""',
        isPrincipal: true
      }
    })
  ]);
  console.log(`✅ ${adresses.length} adresses créées`);

  // Créer les contrats
  console.log('📄 Création des contrats...');
  const contrats = await Promise.all([
    // Contrat pour TechnoSoft Solutions
    prisma.contrat.create({
      data: {
        clientId: clients[0].id,
        reference: 'REF-202401-0001',
        numeroContrat: 'CTR-202401-0001',
        titre: 'Contrat de maintenance annuelle',
        description: 'Maintenance des serveurs et support technique niveau 2',
        typeContrat: 'MAINTENANCE',
        dateDebut: new Date('2024-01-01'),
        dateFin: new Date('2024-12-31'),
        dateSignature: new Date('2023-12-15'),
        dateEffet: new Date('2024-01-01'),
        montantHT: 25000,
        montantTTC: 30000,
        devise: 'EUR',
        tauxTVA: 20,
        periodicitePaiement: 'TRIMESTRIEL',
        jourPaiement: 15,
        status: 'ACTIF',
        estRenouvelable: true,
        periodeRenouvellement: '1Y',
        dateProchainRenouvellement: new Date('2024-12-01'),
        preavisRenouvellement: 30,
        conditionsParticulieres: 'Support 24/7 inclus',
        signataireId: contacts[0].id,
        createdBy: 'system'
      }
    }),
    // Contrat pour Martin Dubois
    prisma.contrat.create({
      data: {
        clientId: clients[1].id,
        reference: 'REF-202401-0002',
        numeroContrat: 'CTR-202401-0002',
        titre: 'Contrat de formation',
        description: 'Formation avancée Excel et Power BI',
        typeContrat: 'FORMATION',
        dateDebut: new Date('2024-02-01'),
        dateFin: new Date('2024-02-28'),
        dateSignature: new Date('2024-01-25'),
        montantHT: 1500,
        montantTTC: 1800,
        devise: 'EUR',
        tauxTVA: 20,
        status: 'ACTIF',
        estRenouvelable: false,
        createdBy: 'system'
      }
    })
  ]);
  console.log(`✅ ${contrats.length} contrats créés`);

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
        fuseauHoraire: 'Europe/Paris',
        formatDate: 'DD/MM/YYYY',
        devise: 'EUR',
        accepteMarketing: true,
        accepteNewsletter: true,
        modeCommunicationPreferé: 'EMAIL',
        rgpdAccepteLe: new Date('2023-04-01'),
        rgpdMiseAJourLe: new Date('2024-01-01'),
        categoriesDonneesConsenties: ['contact', 'facturation', 'support']
      }
    }),
    prisma.preferenceClient.create({
      data: {
        clientId: clients[1].id,
        langue: 'fr',
        fuseauHoraire: 'Europe/Paris',
        formatDate: 'DD/MM/YYYY',
        devise: 'EUR',
        accepteMarketing: false,
        accepteNewsletter: true,
        modeCommunicationPreferé: 'TELEPHONE',
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
  console.log(`✅ ${mappings.length} mappings créés`);

  console.log('🎉 Seeding terminé avec succès !');
}

main()
  .catch((error) => {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });