const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, categorie, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (categorie) {
      where.categorie = categorie;
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [materiels, total] = await Promise.all([
      prisma.materiel.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          _count: {
            select: {
              sorties: true
            }
          }
        },
        orderBy: { nom: 'asc' }
      }),
      prisma.materiel.count({ where })
    ]);

    const enrichedMateriels = materiels.map(m => ({
      ...m,
      enAlerte: m.quantiteStock <= m.seuilAlerte,
      enRupture: m.quantiteStock <= m.seuilRupture
    }));

    res.json({
      success: true,
      message: 'Matériels récupérés avec succès',
      data: enrichedMateriels,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAll materiels:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des matériels'
    });
  }
};

exports.getAlertes = async (req, res) => {
  try {
    const materiels = await prisma.materiel.findMany({
      where: {
        OR: [
          { quantiteStock: { lte: prisma.materiel.fields.seuilAlerte } }
        ]
      },
      orderBy: { quantiteStock: 'asc' }
    });

    const alertes = materiels.filter(m => m.quantiteStock <= m.seuilAlerte);
    const ruptures = alertes.filter(m => m.quantiteStock <= m.seuilRupture);

    res.json({
      success: true,
      message: 'Alertes matériel récupérées avec succès',
      data: {
        total: alertes.length,
        ruptures: ruptures.length,
        alertes: alertes.map(m => ({
          ...m,
          niveau: m.quantiteStock <= m.seuilRupture ? 'RUPTURE' : 'ALERTE'
        }))
      }
    });
  } catch (error) {
    console.error('Error in getAlertes materiels:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des alertes'
    });
  }
};

exports.getSortiesEnCours = async (req, res) => {
  try {
    const sorties = await prisma.sortieMateriel.findMany({
      where: {
        dateRetour: null
      },
      include: {
        materiel: {
          select: {
            reference: true,
            nom: true
          }
        },
        intervention: {
          select: {
            titre: true,
            mission: {
              select: {
                numeroMission: true
              }
            }
          }
        },
        technicien: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: { dateSortie: 'desc' }
    });

    res.json({
      success: true,
      message: 'Sorties de matériel en cours récupérées avec succès',
      data: sorties
    });
  } catch (error) {
    console.error('Error in getSortiesEnCours:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des sorties en cours'
    });
  }
};
