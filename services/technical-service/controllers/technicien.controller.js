const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['AVAILABLE', 'ON_MISSION', 'ON_LEAVE', 'SICK', 'TRAINING'];

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [techniciens, total] = await Promise.all([
      prisma.technicien.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          specialite: {
            select: { id: true, nom: true }
          },
          _count: {
            select: {
              missions: true,
              interventions: true
            }
          }
        },
        orderBy: { nom: 'asc' }
      }),
      prisma.technicien.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Techniciens récupérés avec succès',
      data: techniciens,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll techniciens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des techniciens'
    });
  }
};

exports.create = async (req, res) => {
  try {
    console.log('📝 Payload reçu:', JSON.stringify(req.body, null, 2));
    
    const {
      nom,
      prenom,
      email,
      telephone,
      specialiteId,
      matricule,
      dateEmbauche,
      tauxHoraire,
      competences,
      certifications,
      notes
    } = req.body;

    if (!nom || !prenom || !telephone || !specialiteId || !matricule || !dateEmbauche) {
      console.log('❌ Validation échouée:', { nom, prenom, telephone, specialiteId, matricule, dateEmbauche });
      return res.status(400).json({
        success: false,
        error: 'Les champs nom, prenom, telephone, specialiteId, matricule et dateEmbauche sont requis'
      });
    }

    const technicien = await prisma.technicien.create({
      data: {
        nom,
        prenom,
        email: email || null,
        telephone,
        specialiteId,
        matricule,
        dateEmbauche: new Date(dateEmbauche),
        tauxHoraire,
        competences: competences || [],
        certifications: certifications || [],
        notes
      },
      include: {
        specialite: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Technicien créé avec succès',
      data: technicien
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('email') ? 'email' : 'matricule';
      return res.status(409).json({
        success: false,
        error: `Un technicien avec cet ${field} existe déjà`
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Spécialité invalide'
      });
    }
    console.error('Error in create technicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du technicien'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const technicien = await prisma.technicien.findUnique({
      where: { id },
      include: {
        specialite: true,
        missions: {
          include: {
            mission: {
              select: {
                id: true,
                numeroMission: true,
                titre: true,
                status: true,
                dateDebut: true,
                dateFin: true
              }
            }
          }
        },
        _count: {
          select: {
            missions: true,
            interventions: true,
            rapportsRediges: true
          }
        }
      }
    });

    if (!technicien) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Technicien récupéré avec succès',
      data: technicien
    });
  } catch (error) {
    console.error('Error in getById technicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du technicien'
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.dateEmbauche) {
      updateData.dateEmbauche = new Date(updateData.dateEmbauche);
    }

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const technicien = await prisma.technicien.update({
      where: { id },
      data: updateData,
      include: {
        specialite: true
      }
    });

    res.json({
      success: true,
      message: 'Technicien mis à jour avec succès',
      data: technicien
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Un technicien avec cet email ou matricule existe déjà'
      });
    }
    console.error('Error in update technicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du technicien'
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit être l'un des suivants: ${VALID_STATUSES.join(', ')}`
      });
    }

    const technicien = await prisma.technicien.update({
      where: { id },
      data: { status },
      include: {
        specialite: true
      }
    });

    res.json({
      success: true,
      message: 'Statut du technicien mis à jour avec succès',
      data: technicien
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }
    console.error('Error in updateStatus technicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
};

exports.getAvailable = async (req, res) => {
  try {
    const techniciens = await prisma.technicien.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        specialite: {
          select: { id: true, nom: true }
        }
      },
      orderBy: { nom: 'asc' }
    });

    res.json({
      success: true,
      message: 'Techniciens disponibles récupérés avec succès',
      data: techniciens
    });
  } catch (error) {
    console.error('Error in getAvailable techniciens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des techniciens disponibles'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await prisma.technicien.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        _count: {
          select: {
            missions: true,
            interventions: true,
            rapportsRediges: true,
            sortiesMateriel: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Technicien non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Statistiques du technicien récupérées avec succès',
      data: stats
    });
  } catch (error) {
    console.error('Error in getStats technicien:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
