import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/my-interventions', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    
    const interventions = await prisma.intervention.findMany({
      where: { userId },
      include: {
        mission: {
          select: {
            numIntervention: true,
            natureIntervention: true,
            client: {
              select: { name: true }
            }
          }
        },
        techniciens: {
          include: {
            technicien: {
              select: {
                nom: true,
                prenom: true,
                utilisateurId: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        userId,
        interventions: interventions.map(int => ({
          id: int.id,
          mission: int.mission.natureIntervention,
          client: int.mission.client.name,
          dateDebut: int.dateHeureDebut,
          techniciens: int.techniciens.map(t => ({
            nom: t.technicien.nom,
            prenom: t.technicien.prenom,
            estUtilisateur: t.technicien.utilisateurId === userId
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Erreur diagnostic:', error);
    res.status(500).json({ success: false, message: 'Erreur diagnostic' });
  }
});

export default router;