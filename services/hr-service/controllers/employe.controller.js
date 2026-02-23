const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Get all employees with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, departement, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (departement) {
      where.departement = departement;
    }
    
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [employes, total] = await Promise.all([
      prisma.employe.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          dateEmbauche: true,
          poste: true,
          departement: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employe.count({ where })
    ]);

    res.json({
      data: employes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des employés' });
  }
};

// Create employee
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      matricule,
      nom,
      prenom,
      email,
      telephone,
      dateEmbauche,
      poste,
      departement,
      salaire,
      status,
      adresse,
      nationalite,
      cnpsNumber,
      cnamNumber,
    } = req.body;

    const employe = await prisma.employe.create({
      data: {
        matricule,
        nom,
        prenom,
        email,
        telephone,
        dateEmbauche: new Date(dateEmbauche),
        poste,
        departement,
        salaire,
        status: status || 'ACTIF',
        adresse,
        nationalite,
        cnpsNumber,
        cnamNumber,
      }
    });

    res.status(201).json(employe);
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un employé avec ce matricule ou cet email existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'employé' });
  }
};

// Get employee by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const employe = await prisma.employe.findUnique({
      where: { id },
      include: {
        conges: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        presences: {
          orderBy: { date: 'desc' },
          take: 10
        },
        evaluations: {
          orderBy: { dateEvaluation: 'desc' },
          take: 5,
          include: {
            evaluateur: {
              select: {
                nom: true,
                prenom: true
              }
            }
          }
        }
      }
    });

    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'employé' });
  }
};

// Update employee
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      nom,
      prenom,
      email,
      telephone,
      poste,
      departement,
      salaire,
      status,
      dateEmbauche,
      adresse,
      nationalite,
      cnpsNumber,
      cnamNumber,
    } = req.body;

    const employe = await prisma.employe.update({
      where: { id },
      data: {
        nom,
        prenom,
        email,
        telephone,
        poste,
        departement,
        salaire,
        status,
        dateEmbauche: dateEmbauche ? new Date(dateEmbauche) : undefined,
        adresse,
        nationalite,
        cnpsNumber,
        cnamNumber,
      }
    });

    res.json(employe);
  } catch (error) {
    console.error('Error updating employee:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un employé avec cet email existe déjà' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'employé' });
  }
};

// Delete employee
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.employe.delete({
      where: { id }
    });

    res.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'employé' });
  }
};

// Get employee statistics
exports.getStats = async (req, res) => {
  try {
    const [total, byStatus, byDepartement] = await Promise.all([
      prisma.employe.count(),
      prisma.employe.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.employe.groupBy({
        by: ['departement'],
        _count: true
      })
    ]);

    res.json({
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byDepartement: byDepartement.reduce((acc, item) => {
        acc[item.departement] = item._count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

// Get employees by department
exports.getByDepartement = async (req, res) => {
  try {
    const { departement } = req.params;

    const employes = await prisma.employe.findMany({
      where: { departement },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        email: true,
        poste: true,
        status: true
      },
      orderBy: { nom: 'asc' }
    });

    res.json({ data: employes, total: employes.length });
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des employés' });
  }
};
