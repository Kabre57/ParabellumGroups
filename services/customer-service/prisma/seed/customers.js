/** Cr?e les types, secteurs et clients de d?monstration. */
async function seedCustomers(prisma) {
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
        codeActivite: 'CI-TIC-DEV',
        libelle: 'Programmation informatique',
        description: 'Conception de logiciels et applications',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeActivite: 'CI-TIC-CONS',
        libelle: 'Conseil en systèmes informatiques',
        description: 'Conseil et assistance en informatique',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeActivite: 'CI-DIST-IT',
        libelle: 'Commerce de gros d\'ordinateurs',
        description: 'Commerce de gros de matériel informatique',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeActivite: 'CI-CONSEIL',
        libelle: 'Conseil pour les affaires',
        description: 'Conseil en gestion et management',
        niveau: 1
      }
    }),
    prisma.secteurActivite.create({
      data: {
        codeActivite: 'CI-REL-CLI',
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
        raisonSociale: 'TechnoSoft Solutions SARL',
        email: 'contact@technosoft.ci',
        telephone: '2722471001',
        mobile: '0708123456',
        fax: '2722471099',
        siteWeb: 'https://www.technosoft.ci',
        idu: 'CI-2023-0001234A',
        ncc: 'NCC-TS-012345',
        rccm: 'CI-ABJ-2023-B-12345',
        codeActivite: 'CI-TIC-DEV',
        typeClientId: typeClients[0].id,
        secteurActiviteId: secteurs[0].id,
        status: 'ACTIF',
        priorite: 'HAUTE',
        source: 'RECOMMANDATION',
        chiffreAffaireAnnuel: 1250000000,
        effectif: 45,
        dateCreationEntreprise: new Date('2020-02-14'),
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
        email: 'martin.dubois@email.ci',
        telephone: '2721423000',
        mobile: '0776543210',
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
        raisonSociale: 'ONG Green Earth CI',
        email: 'info@greenearth.ci',
        telephone: '2730456789',
        siteWeb: 'https://www.greenearth.ci',
        typeClientId: typeClients[2].id,
        secteurActiviteId: secteurs[3].id,
        status: 'PROSPECT',
        priorite: 'BASSE',
        source: 'SALON',
        effectif: 12,
        dateCreationEntreprise: new Date('2018-09-10'),
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
        email: 'contact@innovatech.ci',
        telephone: '2730302020',
        mobile: '0556677889',
        fax: '2730302099',
        siteWeb: 'https://www.innovatech.ci',
        idu: 'CI-2021-0009876B',
        ncc: 'NCC-IN-778899',
        rccm: 'CI-ABJ-2021-B-98765',
        codeActivite: 'CI-TIC-CONS',
        typeClientId: typeClients[0].id,
        secteurActiviteId: secteurs[1].id,
        status: 'LEAD_CHAUD',
        priorite: 'CRITIQUE',
        source: 'APPEL_ENTRANT',
        chiffreAffaireAnnuel: 3400000000,
        effectif: 120,
        dateCreationEntreprise: new Date('2017-06-05'),
        commercialId: 'admin-user-id',
        datePremierContact: new Date('2024-01-20'),
        createdBy: 'system',
        updatedBy: 'system'
      }
    })
  ]);
  console.log(`✅ ${clients.length} clients créés`);

  return { clients };
}

module.exports = { seedCustomers };
