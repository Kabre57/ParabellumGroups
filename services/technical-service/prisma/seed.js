const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Début du seeding...');

  // Créer des spécialités
  const specialites = await Promise.all([
    prisma.specialite.upsert({
      where: { nom: 'Électricité' },
      create: {
        nom: 'Électricité',
        description: 'Installation et maintenance électrique'
      },
      update: {
        description: 'Installation et maintenance électrique'
      }
    }),
    prisma.specialite.upsert({
      where: { nom: 'Plomberie' },
      create: {
        nom: 'Plomberie',
        description: 'Installation et réparation de plomberie'
      },
      update: {
        description: 'Installation et réparation de plomberie'
      }
    }),
    prisma.specialite.upsert({
      where: { nom: 'Climatisation' },
      create: {
        nom: 'Climatisation',
        description: 'Installation et maintenance de systèmes de climatisation'
      },
      update: {
        description: 'Installation et maintenance de systèmes de climatisation'
      }
    }),
    prisma.specialite.upsert({
      where: { nom: 'Chauffage' },
      create: {
        nom: 'Chauffage',
        description: 'Installation et maintenance de systèmes de chauffage'
      },
      update: {
        description: 'Installation et maintenance de systèmes de chauffage'
      }
    }),
    prisma.specialite.upsert({
      where: { nom: 'Sécurité' },
      create: {
        nom: 'Sécurité',
        description: 'Installation de systèmes de sécurité et surveillance'
      },
      update: {
        description: 'Installation de systèmes de sécurité et surveillance'
      }
    })
  ]);

  console.log(`✅ ${specialites.length} spécialités créées`);

  // Créer des techniciens
  const techniciens = await Promise.all([
    prisma.technicien.upsert({
      where: { matricule: 'TECH-001' },
      create: {
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@parabellum.com',
        telephone: '+225 07 07 07 01 01',
        specialiteId: specialites[0].id,
        matricule: 'TECH-001',
        dateEmbauche: new Date('2023-01-15'),
        tauxHoraire: 25.50,
        competences: ['Installation triphasé', 'Dépannage'],
        certifications: ['Habilitation électrique B2V']
      },
      update: {
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@parabellum.com',
        telephone: '+225 07 07 07 01 01',
        specialiteId: specialites[0].id,
        dateEmbauche: new Date('2023-01-15'),
        tauxHoraire: 25.50,
        competences: ['Installation triphasé', 'Dépannage'],
        certifications: ['Habilitation électrique B2V']
      }
    }),
    prisma.technicien.upsert({
      where: { matricule: 'TECH-002' },
      create: {
        nom: 'Martin',
        prenom: 'Marie',
        email: 'marie.martin@parabellum.com',
        telephone: '+225 07 07 07 02 02',
        specialiteId: specialites[2].id,
        matricule: 'TECH-002',
        dateEmbauche: new Date('2023-03-10'),
        tauxHoraire: 28.00,
        competences: ['Installation climatisation', 'Maintenance préventive'],
        certifications: ['F-GAS Cat 1', 'Fluides frigorigènes']
      },
      update: {
        nom: 'Martin',
        prenom: 'Marie',
        email: 'marie.martin@parabellum.com',
        telephone: '+225 07 07 07 02 02',
        specialiteId: specialites[2].id,
        dateEmbauche: new Date('2023-03-10'),
        tauxHoraire: 28.00,
        competences: ['Installation climatisation', 'Maintenance préventive'],
        certifications: ['F-GAS Cat 1', 'Fluides frigorigènes']
      }
    }),
    prisma.technicien.upsert({
      where: { matricule: 'TECH-003' },
      create: {
        nom: 'Bernard',
        prenom: 'Paul',
        email: 'paul.bernard@parabellum.com',
        telephone: '+225 07 07 07 03 03',
        specialiteId: specialites[1].id,
        matricule: 'TECH-003',
        dateEmbauche: new Date('2022-11-20'),
        tauxHoraire: 24.00,
        competences: ['Plomberie sanitaire', 'Installation chauffage'],
        certifications: ['PGN - Professionnel Gaz Naturel']
      },
      update: {
        nom: 'Bernard',
        prenom: 'Paul',
        email: 'paul.bernard@parabellum.com',
        telephone: '+225 07 07 07 03 03',
        specialiteId: specialites[1].id,
        dateEmbauche: new Date('2022-11-20'),
        tauxHoraire: 24.00,
        competences: ['Plomberie sanitaire', 'Installation chauffage'],
        certifications: ['PGN - Professionnel Gaz Naturel']
      }
    }),
    prisma.technicien.upsert({
      where: { matricule: 'TECH-004' },
      create: {
        nom: 'Kouadio',
        prenom: 'Aya',
        email: 'aya.kouadio@parabellum.com',
        telephone: '+225 07 07 07 04 04',
        specialiteId: specialites[4].id,
        matricule: 'TECH-004',
        dateEmbauche: new Date('2023-06-01'),
        tauxHoraire: 30.00,
        competences: ['Vidéosurveillance', 'Alarmes intrusion', 'Contrôle d\'accès'],
        certifications: ['APSAD R81', 'APSAD R82']
      },
      update: {
        nom: 'Kouadio',
        prenom: 'Aya',
        email: 'aya.kouadio@parabellum.com',
        telephone: '+225 07 07 07 04 04',
        specialiteId: specialites[4].id,
        dateEmbauche: new Date('2023-06-01'),
        tauxHoraire: 30.00,
        competences: ['Vidéosurveillance', 'Alarmes intrusion', 'Contrôle d\'accès'],
        certifications: ['APSAD R81', 'APSAD R82']
      }
    })
  ]);

  console.log(`✅ ${techniciens.length} techniciens créés`);

  // Créer des missions
  const missions = await Promise.all([
    prisma.mission.upsert({
      where: { numeroMission: 'MISS-2026-001' },
      create: {
        numeroMission: 'MISS-2026-001',
        titre: 'Installation électrique immeuble Plateau',
        clientNom: 'SCI Les Plateaux',
        clientContact: '+225 01 02 03 04 05',
        adresse: 'Plateau, Abidjan',
        description: 'Installation électrique complète d\'un immeuble de 5 étages',
        priorite: 'HAUTE',
        dateDebut: new Date('2026-01-20'),
        status: 'EN_COURS'
      },
      update: {
        titre: 'Installation électrique immeuble Plateau',
        clientNom: 'SCI Les Plateaux',
        clientContact: '+225 01 02 03 04 05',
        adresse: 'Plateau, Abidjan',
        description: 'Installation électrique complète d\'un immeuble de 5 étages',
        priorite: 'HAUTE',
        dateDebut: new Date('2026-01-20'),
        status: 'EN_COURS'
      }
    }),
    prisma.mission.upsert({
      where: { numeroMission: 'MISS-2026-002' },
      create: {
        numeroMission: 'MISS-2026-002',
        titre: 'Maintenance climatisation Centre Commercial',
        clientNom: 'Cap Sud Shopping',
        clientContact: '+225 05 06 07 08 09',
        adresse: 'Marcory, Abidjan',
        description: 'Maintenance préventive de tous les systèmes CVC',
        priorite: 'NORMALE',
        dateDebut: new Date('2026-01-22'),
        status: 'PLANIFIEE'
      },
      update: {
        titre: 'Maintenance climatisation Centre Commercial',
        clientNom: 'Cap Sud Shopping',
        clientContact: '+225 05 06 07 08 09',
        adresse: 'Marcory, Abidjan',
        description: 'Maintenance préventive de tous les systèmes CVC',
        priorite: 'NORMALE',
        dateDebut: new Date('2026-01-22'),
        status: 'PLANIFIEE'
      }
    })
  ]);

  console.log(`✅ ${missions.length} missions créées`);

  console.log('🎉 Seeding terminé avec succès !');
}

seed()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
