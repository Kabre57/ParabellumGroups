// src/controllers/technicienController.ts
import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

/**
 * GET /api/v1/techniciens
 * Récupère tous les techniciens avec filtres
 */
export const getTechniciens = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search, specialiteId, status, serviceId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
      isActive: true
    };

    if (search) {
      whereClause.OR = [
        { nom: { contains: search as string, mode: 'insensitive' } },
        { prenom: { contains: search as string, mode: 'insensitive' } },
        { contact: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (specialiteId) {
      whereClause.specialiteId = Number(specialiteId);
    }

    if (status) {
      whereClause.status = status;
    }

    if (serviceId) {
      whereClause.utilisateur = {
        serviceId: Number(serviceId)
      };
    }

    const [techniciens, total] = await Promise.all([
      prisma.technicien.findMany({
        where: whereClause,
        include: {
          specialite: true,
          utilisateur: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              serviceId: true,
              service: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              interventions: true,
              rapports: true,
              sortiesMateriels: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { nom: 'asc' }
      }),
      prisma.technicien.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        techniciens,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des techniciens:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * GET /api/v1/techniciens/:id
 * Récupère un technicien par son ID
 */
export const getTechnicienById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const technicien = await prisma.technicien.findUnique({
      where: { id: Number(id) },
      include: {
        specialite: true,
        utilisateur: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            serviceId: true,
            service: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        interventions: {
          include: {
            intervention: {
              include: {
                mission: {
                  include: {
                    client: {
                      select: {
                        id: true,
                        name: true,
                        customerNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        rapports: {
          include: {
            mission: true,
            intervention: true
          }
        },
        sortiesMateriels: {
          include: {
            materiel: true,
            intervention: true
          }
        }
      }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        message: 'Technicien non trouvé'
      });
    }

    res.json({
      success: true,
      data: technicien
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * POST /api/v1/techniciens (payload combiné)
 * 
 * 1) Sans compte:
 *    { "nom":"Koffi","prenom":"Jean","contact":"+225...","specialiteId":1 }
 * 
 * 2) Associer un user existant:
 *    { "nom":"Koffi","prenom":"Jean","contact":"+225...","specialiteId":1,"utilisateurId":12 }
 * 
 * 3) Créer le user puis le technicien:
 *    {
 *      "nom":"Koffi","prenom":"Jean","contact":"+225...","specialiteId":1,
 *      "createUser": { "email":"jean@exemple.com","firstName":"Jean","lastName":"Koffi","role":"EMPLOYEE","serviceId":2,"password":"Secret123!" }
 *    }
 */
export const createTechnicienCombined = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      nom,
      prenom,
      contact,
      specialiteId,
      utilisateurId,
      createUser,
    } = req.body as {
      nom: string;
      prenom: string;
      contact: string;
      specialiteId: number;
      utilisateurId?: number;
      createUser?: {
        email: string;
        firstName?: string;
        lastName?: string;
        role?: UserRole | string;
        serviceId?: number;
        password?: string;
      };
    };

    if (!nom || !prenom || !contact || !specialiteId) {
      return res.status(400).json({
        success: false,
        message: 'nom, prenom, contact et specialiteId sont requis',
      });
    }

    // Vérifier que la spécialité existe
    const specialite = await prisma.specialite.findUnique({
      where: { id: Number(specialiteId) }
    });

    if (!specialite) {
      return res.status(404).json({
        success: false,
        message: 'Spécialité non trouvée'
      });
    }

    const DEFAULT_ROLE: UserRole = 'EMPLOYEE';

    const created = await prisma.$transaction(async (tx) => {
      let linkedUserId: number | null = null;

      // 1) Lier un user existant
      if (utilisateurId) {
        const user = await tx.user.findUnique({ 
          where: { id: Number(utilisateurId) } 
        });
        
        if (!user) {
          throw new Error("Utilisateur à associer introuvable");
        }

        // Vérifier si ce user est déjà lié à un autre technicien
        const existingTechnicien = await tx.technicien.findUnique({
          where: { utilisateurId: user.id }
        });

        if (existingTechnicien) {
          throw new Error("Ce compte utilisateur est déjà lié à un technicien");
        }

        linkedUserId = user.id;
      }

      // 2) Créer le user si demandé et aucun utilisateurId fourni
      if (!linkedUserId && createUser) {
        const email = String(createUser.email || '').trim().toLowerCase();
        if (!email) {
          throw new Error("L'email est requis pour créer un compte utilisateur");
        }

        // Vérifier si l'email existe déjà
        const existingUser = await tx.user.findUnique({ 
          where: { email } 
        });
        
        if (existingUser) {
          throw new Error('Un utilisateur existe déjà avec cet email');
        }

        const role: UserRole = (
          ['EMPLOYEE', 'SERVICE_MANAGER', 'GENERAL_DIRECTOR', 'ADMIN'].includes(String(createUser.role))
            ? (createUser.role as UserRole)
            : DEFAULT_ROLE
        );

        const rawPassword = createUser.password || Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName: createUser.firstName || prenom,
            lastName: createUser.lastName || nom,
            role,
            serviceId: createUser.serviceId ?? undefined,
            isActive: true,
          },
        });

        linkedUserId = newUser.id;
        // TODO: envoyer email d'activation / mot de passe si besoin
      }

      // 3) Créer le technicien
      const technicien = await tx.technicien.create({
        data: {
          nom,
          prenom,
          contact,
          specialiteId: Number(specialiteId),
          utilisateurId: linkedUserId ?? undefined, // peut être null
        },
        include: {
          specialite: true,
          utilisateur: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true, 
              role: true, 
              serviceId: true,
              service: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
          },
        },
      });

      return technicien;
    });

    return res.status(201).json({ 
      success: true, 
      data: created,
      message: 'Technicien créé avec succès'
    });
  } catch (error: any) {
    console.error('[createTechnicienCombined] error:', error);
    
    // Gestion spécifique des erreurs de contrainte unique
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        success: false, 
        message: 'Violation de contrainte unique - Ce technicien existe peut-être déjà' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: error?.message || 'Erreur interne du serveur' 
    });
  }
};

/**
 * PUT /api/v1/techniciens/:id
 * Met à jour un technicien
 */
export const updateTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingTechnicien = await prisma.technicien.findUnique({
      where: { id: Number(id) }
    });

    if (!existingTechnicien) {
      return res.status(404).json({
        success: false,
        message: 'Technicien non trouvé'
      });
    }

    const {
      nom,
      prenom,
      contact,
      specialiteId,
      status
    } = req.body;

    // Vérifier que la spécialité existe si elle est fournie
    if (specialiteId) {
      const specialite = await prisma.specialite.findUnique({
        where: { id: Number(specialiteId) }
      });

      if (!specialite) {
        return res.status(404).json({
          success: false,
          message: 'Spécialité non trouvée'
        });
      }
    }

    const technicien = await prisma.technicien.update({
      where: { id: Number(id) },
      data: {
        nom,
        prenom,
        contact,
        specialiteId: specialiteId ? Number(specialiteId) : undefined,
        status
      },
      include: {
        specialite: true,
        utilisateur: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            serviceId: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: technicien,
      message: 'Technicien mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * DELETE /api/v1/techniciens/:id
 * Supprime un technicien (soft delete)
 */
export const deleteTechnicien = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingTechnicien = await prisma.technicien.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            interventions: true,
            rapports: true,
            sortiesMateriels: true
          }
        }
      }
    });

    if (!existingTechnicien) {
      return res.status(404).json({
        success: false,
        message: 'Technicien non trouvé'
      });
    }

    // Vérifier s'il y a des données associées
    const hasData = existingTechnicien._count.interventions > 0 || 
                   existingTechnicien._count.rapports > 0 || 
                   existingTechnicien._count.sortiesMateriels > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un technicien ayant des interventions, rapports ou matériels associés'
      });
    }

    // Soft delete - désactiver le technicien
    await prisma.technicien.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Technicien supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du technicien:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Validation middleware
export const validateTechnicien = [
  body('nom').notEmpty().withMessage('Nom requis'),
  body('prenom').notEmpty().withMessage('Prénom requis'),
  body('contact').notEmpty().withMessage('Contact requis'),
  body('specialiteId').isInt({ min: 1 }).withMessage('Spécialité invalide'),
  body('utilisateurId').optional().isInt({ min: 1 }).withMessage('ID utilisateur invalide'),
  body('createUser.email').optional().isEmail().withMessage('Email invalide'),
  body('createUser.role').optional().isIn(['EMPLOYEE', 'SERVICE_MANAGER', 'GENERAL_DIRECTOR', 'ADMIN']).withMessage('Rôle invalide')
];