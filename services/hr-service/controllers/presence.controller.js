const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { calculateDuration } = require('../utils/presenceCalculator');

const prisma = new PrismaClient();

// Create presence record
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeId, date, heureArrivee, heureDepart, type } = req.body;

    // Calculate duration if both times are provided
    let duree = null;
    if (heureArrivee && heureDepart) {
      duree = calculateDuration(heureArrivee, heureDepart);
    }

    const presence = await prisma.presence.create({
      data: {
        employeId,
        date: new Date(date),
        heureArrivee: heureArrivee ? new Date(heureArrivee) : null,
        heureDepart: heureDepart ? new Date(heureDepart) : null,
        duree,
        type: type || 'BUREAU'
      },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true
          }
        }
      }
    });

    res.status(201).json(presence);
  } catch (error) {
    console.error('Error creating presence:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Une présence existe déjà pour cet employé à cette date' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la présence' });
  }
};

// Get presence by employee
exports.getByEmploye = async (req, res) => {
  try {
    const { employeId } = req.params;
    const { dateDebut, dateFin, type } = req.query;

    const where = {
      employeId
    };

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut);
      }
      if (dateFin) {
        where.date.lte = new Date(dateFin);
      }
    }

    if (type) {
      where.type = type;
    }

    const presences = await prisma.presence.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json({ data: presences, total: presences.length });
  } catch (error) {
    console.error('Error fetching presences:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des présences' });
  }
};

// Get presence statistics
exports.getStats = async (req, res) => {
  try {
    const { employeId, dateDebut, dateFin } = req.query;

    if (!employeId) {
      return res.status(400).json({ error: 'L\'ID de l\'employé est requis' });
    }

    const where = {
      employeId
    };

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut);
      }
      if (dateFin) {
        where.date.lte = new Date(dateFin);
      }
    }

    const presences = await prisma.presence.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Calculate statistics
    const totalDays = presences.length;
    const totalHours = presences.reduce((sum, p) => sum + (parseFloat(p.duree) || 0), 0);
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    const byType = presences.reduce((acc, presence) => {
      acc[presence.type] = (acc[presence.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalDays,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
      byType,
      periode: {
        debut: dateDebut || presences[0]?.date,
        fin: dateFin || presences[presences.length - 1]?.date
      }
    });
  } catch (error) {
    console.error('Error fetching presence stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques de présence' });
  }
};

// Export presences
exports.export = async (req, res) => {
  try {
    const { employeId, dateDebut, dateFin, departement } = req.query;

    const where = {};

    if (employeId) {
      where.employeId = employeId;
    }

    if (departement) {
      where.employe = {
        departement
      };
    }

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut);
      }
      if (dateFin) {
        where.date.lte = new Date(dateFin);
      }
    }

    const presences = await prisma.presence.findMany({
      where,
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            departement: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { employe: { nom: 'asc' } }
      ]
    });

    // Format data for export
    const exportData = presences.map(p => ({
      matricule: p.employe.matricule,
      nom: `${p.employe.nom} ${p.employe.prenom}`,
      departement: p.employe.departement,
      date: p.date.toISOString().split('T')[0],
      heureArrivee: p.heureArrivee ? p.heureArrivee.toISOString() : null,
      heureDepart: p.heureDepart ? p.heureDepart.toISOString() : null,
      duree: p.duree ? parseFloat(p.duree) : null,
      type: p.type
    }));

    res.json({ 
      data: exportData, 
      total: exportData.length,
      exportDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting presences:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export des présences' });
  }
};

// Update presence
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { heureArrivee, heureDepart, type } = req.body;

    // Calculate new duration if times are provided
    let duree = null;
    if (heureArrivee && heureDepart) {
      duree = calculateDuration(heureArrivee, heureDepart);
    }

    const presence = await prisma.presence.update({
      where: { id },
      data: {
        heureArrivee: heureArrivee ? new Date(heureArrivee) : undefined,
        heureDepart: heureDepart ? new Date(heureDepart) : undefined,
        duree,
        type
      },
      include: {
        employe: {
          select: {
            matricule: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.json(presence);
  } catch (error) {
    console.error('Error updating presence:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Présence non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la présence' });
  }
};
