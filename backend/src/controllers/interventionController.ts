// src/controllers/interventionController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * Utilitaire: construit le where Prisma selon les query params
 */
function buildWhere(query: any) {
  const { search, statut, missionId, technicienId } = query;

  const where: any = {};

  if (statut) where.statut = String(statut);

  if (missionId) where.missionId = String(missionId);

  if (technicienId) {
    // filtre par technicien via la table de jointure
    where.techniciens = {
      some: { technicienId: Number(technicienId) },
    };
  }

  if (search) {
    const s = String(search);
    where.OR = [
      { commentaire: { contains: s, mode: 'insensitive' } },
      { missionId: { contains: s, mode: 'insensitive' } },
      {
        mission: {
          OR: [
            { numIntervention: { contains: s, mode: 'insensitive' } },
            { natureIntervention: { contains: s, mode: 'insensitive' } },
            { client: { name: { contains: s, mode: 'insensitive' } } as any },
          ],
        },
      },
    ];
  }

  return where;
}

/**
 * Inclus communs pour retourner une intervention "complète"
 * - mission + client
 * - techniciens + technicien (user de base ou entité Technicien)
 * - (laisser "materiels" si tu veux aussi joindre les sorties)
 */
const interventionInclude = {
  mission: {
    include: {
      client: true,
    },
  },
  techniciens: {
    include: {
      technicien: true, // <-- suppose un modèle Technicien et une FK technicienId
    },
  },
} as const;

/**
 * GET /interventions
 * Retourne { success, data: { interventions, pagination } }
 */
export const getInterventions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where = buildWhere(req.query);

// /* RBAC where injected */
try {
  const role = req.user!.role;
  const userId = req.user!.userId;
  const serviceId = req.user!.serviceId;

  if (role === 'EMPLOYEE') {
    (where as any).userId = userId;
  } else if ((role === 'SERVICE_MANAGER' || role === 'GENERAL_DIRECTOR') && serviceId) {
    (where as any).user = { serviceId };
  }
} catch (_) { /* keep graceful */ }


    const [rows, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        include: interventionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.intervention.count({ where }),
    ]);

    // Normalisation de la durée: si elle est nulle mais qu’on a début+fin → calcule côté API
    const interventions = rows.map((r) => {
      let duree = r.duree ?? null;
      if (duree == null && r.dateHeureDebut && r.dateHeureFin) {
        const ms = new Date(r.dateHeureFin).getTime() - new Date(r.dateHeureDebut).getTime();
        if (ms > 0) duree = Math.round(ms / 60000);
      }
      return { ...r, duree };
    });

    res.json({
      success: true,
      data: {
        interventions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (error) {
    console.error('[getInterventions] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * GET /interventions/:id
 */
export const getInterventionById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.intervention.findUnique({
      where: { id },
      include: interventionInclude,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Intervention non trouvée' });

    let duree = item.duree ?? null;
    if (duree == null && item.dateHeureDebut && item.dateHeureFin) {
      const ms = new Date(item.dateHeureFin).getTime() - new Date(item.dateHeureDebut).getTime();
      if (ms > 0) duree = Math.round(ms / 60000);
    }

    res.json({ success: true, data: { ...item, duree } });
  } catch (error) {
    console.error('[getInterventionById] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /interventions
 * Body attendu:
 * {
 *   missionId: string,
 *   dateHeureDebut: string (ISO),
 *   dateHeureFin?: string (ISO),
 *   techniciens?: [{ technicienId:number, role:'Principal'|'Assistant', commentaire?:string }],
 *   materiels?: [{ materielId:number, quantite:number, commentaire?:string }],
 *   commentaire?: string
 * }
 */
export const createIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      missionId,
      dateHeureDebut,
      dateHeureFin,
      techniciens = [],
      materiels = [],
      commentaire,
    } = req.body ?? {};

    if (!missionId) return res.status(400).json({ success: false, message: 'missionId requis' });
    if (!dateHeureDebut) return res.status(400).json({ success: false, message: 'dateHeureDebut requise' });

    const userId = req.user!.userId;

    // Crée l’intervention
    const created = await prisma.intervention.create({
      data: {
        missionId: String(missionId),
        dateHeureDebut: new Date(dateHeureDebut),
        dateHeureFin: dateHeureFin ? new Date(dateHeureFin) : null,
        commentaire: commentaire || null,
        userId,
        // statut laissé à sa valeur par défaut "planifiee"
      },
    });

    // Crée les liaisons techniciens (table de jointure)
    if (Array.isArray(techniciens) && techniciens.length > 0) {
      await prisma.technicienIntervention.createMany({
        data: techniciens
          .filter((t: any) => t?.technicienId)
          .map((t: any) => ({
            interventionId: created.id,
            technicienId: Number(t.technicienId),
            role: t.role ?? 'Principal',
            commentaire: t.commentaire ?? null,
          })),
      });
    }

    // Optionnel: traiter les "materiels" ici si tu as une table de sorties à créer

    // Recharger avec include
    const full = await prisma.intervention.findUnique({
      where: { id: created.id },
      include: interventionInclude,
    });

    res.status(201).json({ success: true, data: full, message: 'Intervention créée avec succès' });
  } catch (error) {
    console.error('[createIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * PUT /interventions/:id
 */
export const updateIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const payload: any = {};
    // on autorise les champs connus uniquement
    [
      'missionId',
      'dateHeureDebut',
      'dateHeureFin',
      'statut',
      'commentaire',
    ].forEach((k) => {
      if (k in req.body) payload[k] = req.body[k];
    });

    if (payload.dateHeureDebut) payload.dateHeureDebut = new Date(payload.dateHeureDebut);
    if (payload.dateHeureFin) payload.dateHeureFin = new Date(payload.dateHeureFin);

    const updated = await prisma.intervention.update({
      where: { id },
      data: payload,
      include: interventionInclude,
    });

    res.json({ success: true, data: updated, message: 'Intervention mise à jour' });
  } catch (error) {
    console.error('[updateIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DELETE /interventions/:id
 */
export const deleteIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Nettoyage jointures techniciens
    await prisma.technicienIntervention.deleteMany({ where: { interventionId: id } });
    // (supprime aussi autres relations si nécessaire)

    await prisma.intervention.delete({ where: { id } });

    res.json({ success: true, message: 'Intervention supprimée' });
  } catch (error) {
    console.error('[deleteIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /interventions/:id/start
 * - passe en "en_cours"
 * - si pas de dateHeureDebut, met maintenant
 */
export const startIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const current = await prisma.intervention.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ success: false, message: 'Intervention non trouvée' });

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        statut: 'en_cours',
        dateHeureDebut: current.dateHeureDebut ?? new Date(),
      },
      include: interventionInclude,
    });

    res.json({ success: true, data: updated, message: 'Intervention démarrée' });
  } catch (error) {
    console.error('[startIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /interventions/:id/end
 * Body: { commentaire?: string }
 * - passe en "terminee"
 * - calcule duree (minutes) = fin - début si possible
 */
export const endIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { commentaire } = req.body ?? {};

    const current = await prisma.intervention.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ success: false, message: 'Intervention non trouvée' });

    const fin = new Date();
    let duree: number | null = current.duree ?? null;

    if (current.dateHeureDebut) {
      const ms = fin.getTime() - new Date(current.dateHeureDebut).getTime();
      if (ms > 0) duree = Math.round(ms / 60000);
    }

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        statut: 'terminee',
        dateHeureFin: fin,
        duree,
        commentaire: commentaire ?? current.commentaire,
      },
      include: interventionInclude,
    });

    res.json({ success: true, data: updated, message: 'Intervention terminée' });
  } catch (error) {
    console.error('[endIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /interventions/:id/validate
 * (à adapter selon ton flux métier : statut "terminee" ou "validee")
 */
export const validateIntervention = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.intervention.update({
      where: { id },
      data: { statut: 'terminee' }, // ou 'validee' si tu as ce statut
      include: interventionInclude,
    });
    res.json({ success: true, data: updated, message: 'Intervention validée' });
  } catch (error) {
    console.error('[validateIntervention] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * POST /interventions/:id/assign-technicien
 * Body: { technicienId:number, role?:'Principal'|'Assistant', commentaire?:string }
 */
export const assignTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { technicienId, role, commentaire } = req.body ?? {};
    if (!technicienId) return res.status(400).json({ success: false, message: 'technicienId requis' });

    // unique (interventionId, technicienId) conseillé dans le schéma Prisma
    await prisma.technicienIntervention.upsert({
      where: {
        interventionId_technicienId: {
          interventionId: id,
          technicienId: Number(technicienId),
        },
      },
      create: {
        interventionId: id,
        technicienId: Number(technicienId),
        role: role ?? 'Assistant',
        commentaire: commentaire ?? null,
      },
      update: {
        role: role ?? 'Assistant',
        commentaire: commentaire ?? null,
      },
    });

    const full = await prisma.intervention.findUnique({
      where: { id },
      include: interventionInclude,
    });

    res.json({ success: true, data: full, message: 'Technicien assigné' });
  } catch (error) {
    console.error('[assignTechnicien] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};

/**
 * DELETE /interventions/:id/technicien/:technicienId
 */
export const removeTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const technicienId = Number(req.params.technicienId);

    await prisma.technicienIntervention.deleteMany({
      where: { interventionId: id, technicienId },
    });

    const full = await prisma.intervention.findUnique({
      where: { id },
      include: interventionInclude,
    });

    res.json({ success: true, data: full, message: 'Technicien retiré' });
  } catch (error) {
    console.error('[removeTechnicien] error:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
};
