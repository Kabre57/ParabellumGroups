import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserInterventions(userId: number) {
  console.log(`🔍 Vérification des interventions pour l'utilisateur ${userId}`);
  
  // 1. Vérifier les interventions directes
  const directInterventions = await prisma.intervention.findMany({
    where: { userId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true }
      },
      mission: {
        select: { numIntervention: true, natureIntervention: true }
      }
    }
  });

  console.log(`📋 Interventions directes: ${directInterventions.length}`);
  directInterventions.forEach(int => {
    console.log(`   - ${int.mission.natureIntervention} (${int.dateHeureDebut})`);
  });

  // 2. Vérifier les interventions via techniciens
  const technicien = await prisma.technicien.findFirst({
    where: { utilisateurId: userId },
    include: {
      interventions: {
        include: {
          intervention: {
            include: {
              mission: {
                select: { numIntervention: true, natureIntervention: true }
              }
            }
          }
        }
      }
    }
  });

  if (technicien) {
    console.log(`🔧 Interventions via technicien: ${technicien.interventions.length}`);
    technicien.interventions.forEach(ti => {
      console.log(`   - ${ti.intervention.mission.natureIntervention} (Rôle: ${ti.role})`);
    });
  }

  return {
    directInterventions,
    technicienInterventions: technicien?.interventions || []
  };
}

// Exemple d'utilisation
// checkUserInterventions(1); // Remplacez par l'ID de l'utilisateur test