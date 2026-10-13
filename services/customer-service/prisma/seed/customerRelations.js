/** Cr?e les contacts, adresses et contrats associ?s aux clients. */
async function seedCustomerRelations(prisma, { clients }) {
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
        email: 'philippe.leroy@technosoft.ci',
        telephone: '2722471001',
        mobile: '0708123456',
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
        email: 'sophie.moreau@technosoft.ci',
        telephone: '2722471010',
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
        email: 'martin.dubois@email.ci',
        telephone: '2721423000',
        mobile: '0776543210',
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
        email: 'marie.petit@greenearth.ci',
        telephone: '2730456789',
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
        email: 'thomas.rousseau@innovatech.ci',
        telephone: '2730302020',
        mobile: '0556677889',
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
        ligne1: 'Riviera Palmeraie',
        ligne2: 'Rue Ministre, Immeuble TechnoSoft',
        ligne3: 'En face de la pharmacie Saint-Viateur',
        codePostal: '01 BP 4567',
        ville: 'Cocody',
        region: 'District d\'Abidjan',
        pays: 'Cote d\'Ivoire',
        coordonneesGps: '5.3714,-3.9658',
        informationsAcces: 'Portail gris, 3e etage',
        isPrincipal: true
      }
    }),
    prisma.adresseClient.create({
      data: {
        clientId: clients[0].id,
        typeAdresse: 'FACTURATION',
        nomAdresse: 'Service comptabilité',
        ligne1: 'Plateau',
        ligne2: 'Avenue Lamblin, Immeuble Horizon',
        ligne3: 'Pres de la BCEAO',
        codePostal: '01 BP 4890',
        ville: 'Plateau',
        region: 'District d\'Abidjan',
        pays: 'Cote d\'Ivoire',
        coordonneesGps: '5.3237,-4.0166',
        informationsAcces: '4e etage, aile B',
        isPrincipal: false
      }
    }),
    // Adresse pour Martin Dubois
    prisma.adresseClient.create({
      data: {
        clientId: clients[1].id,
        typeAdresse: 'FACTURATION',
        ligne1: 'Zone 4',
        ligne2: 'Rue du Canal',
        ligne3: 'Pres de l\'allocodrome',
        codePostal: '18 BP 245',
        ville: 'Marcory',
        region: 'District d\'Abidjan',
        pays: 'Cote d\'Ivoire',
        coordonneesGps: '5.2864,-3.9780',
        informationsAcces: 'Villa basse creme, portail noir',
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
        montantHT: 18000000,
        montantTTC: 21240000,
        devise: 'XOF',
        tauxTVA: 18,
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
        montantHT: 850000,
        montantTTC: 1003000,
        devise: 'XOF',
        tauxTVA: 18,
        status: 'ACTIF',
        estRenouvelable: false,
        createdBy: 'system'
      }
    })
  ]);
  console.log(`✅ ${contrats.length} contrats créés`);

  return { contacts, contrats };
}

module.exports = { seedCustomerRelations };
