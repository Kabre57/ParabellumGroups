const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Début du seeding...');

  // Créer des spécialités
  const specialites = await Promise.all([
    prisma.specialite.create({
      data: {
        nom: 'Électricité',
        description: 'Installation et maintenance électrique'
      }
    }),
    prisma.specialite.create({
      data: {
        nom: 'Plomberie',
        description: 'Installation et réparation de plomberie'
      }
    }),
    prisma.specialite.create({
      data: {
        nom: 'Climatisation',
        description: 'Installation et maintenance de systèmes de climatisation'
      }
    }),
    prisma.specialite.create({
      data: {
        nom: 'Chauffage',
        description: 'Installation et maintenance de systèmes de chauffage'
      }
    }),
    prisma.specialite.create({
      data: {
        nom: 'Sécurité',
        description: 'Installation de systèmes de sécurité et surveillance'
      }
    })
  ]);

  console.log(`✅ ${specialites.length} spécialités créées`);

  // Créer des techniciens
  const techniciens = await Promise.all([
    prisma.technicien.create({
      data: {
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
      }
    }),
    prisma.technicien.create({
      data: {
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
      }
    }),
    prisma.technicien.create({
      data: {
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
      }
    }),
    prisma.technicien.create({
      data: {
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
      }
    })
  ]);

  console.log(`✅ ${techniciens.length} techniciens créés`);

  // Créer des missions
  const missions = await Promise.all([
    prisma.mission.create({
      data: {
        numeroMission: 'MISS-2026-001',
        titre: 'Installation électrique immeuble Plateau',
        natureIntervention: 'Installation électrique',
        objectifDuContrat: 'Installation complète du réseau électrique',
        clientNom: 'SCI Les Plateaux',
        description: 'Installation électrique complète d\'un immeuble de 5 étages',
        priorite: 'haute',
        dateSortieFicheIntervention: new Date('2026-01-20'),
        status: 'EN_COURS'
      }
    }),
    prisma.mission.create({
      data: {
        numeroMission: 'MISS-2026-002',
        titre: 'Maintenance climatisation Centre Commercial',
        natureIntervention: 'Maintenance préventive',
        objectifDuContrat: 'Maintenance annuelle systèmes de climatisation',
        clientNom: 'Cap Sud Shopping',
        description: 'Maintenance préventive de tous les systèmes CVC',
        priorite: 'normale',
        dateSortieFicheIntervention: new Date('2026-01-22'),
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
