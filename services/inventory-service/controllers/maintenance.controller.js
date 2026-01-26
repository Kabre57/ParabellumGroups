const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createMaintenance = async (req, res) => {
  try {
    const maintenance = await prisma.maintenanceEquipement.create({
      data: req.body,
      include: {
        equipement: true
      }
    });

    // Si la maintenance démarre immédiatement, mettre à jour le statut de l'équipement
    if (req.body.status === 'EN_COURS') {
      await prisma.equipement.update({
        where: { id: req.body.equipementId },
        data: { status: 'EN_MAINTENANCE' }
      });
    }

    res.status(201).json(maintenance);
  } catch (error) {
    console.error('Erreur création maintenance:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la maintenance' });
  }
};

exports.getAllMaintenances = async (req, res) => {
  try {
    const { status, type, equipementId } = req.query;
    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (equipementId) where.equipementId = equipementId;

    const maintenances = await prisma.maintenanceEquipement.findMany({
      where,
      orderBy: { dateDebut: 'desc' },
      include: {
        equipement: {
          select: {
            reference: true,
            nom: true,
            categorie: true
          }
        }
      }
    });
    res.json(maintenances);
  } catch (error) {
    console.error('Erreur récupération maintenances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des maintenances' });
  }
};

exports.getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await prisma.maintenanceEquipement.findUnique({
      where: { id: req.params.id },
      include: {
        equipement: true
      }
    });
    
    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance non trouvée' });
    }
    
    res.json(maintenance);
  } catch (error) {
    console.error('Erreur récupération maintenance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la maintenance' });
  }
};

exports.updateMaintenance = async (req, res) => {
  try {
    const maintenance = await prisma.maintenanceEquipement.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(maintenance);
  } catch (error) {
    console.error('Erreur mise à jour maintenance:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la maintenance' });
  }
};

exports.deleteMaintenance = async (req, res) => {
  try {
    await prisma.maintenanceEquipement.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression maintenance:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la maintenance' });
  }
};

exports.completeMaintenance = async (req, res) => {
  try {
    const { coutReel } = req.body;

    const maintenance = await prisma.maintenanceEquipement.update({
      where: { id: req.params.id },
      data: {
        status: 'TERMINEE',
        dateFin: new Date(),
        coutReel: coutReel || 0
      },
      include: {
        equipement: true
      }
    });

    // Remettre l'équipement en service
    await prisma.equipement.update({
      where: { id: maintenance.equipementId },
      data: { status: 'EN_SERVICE' }
    });

    res.json(maintenance);
  } catch (error) {
    console.error('Erreur complétion maintenance:', error);
    res.status(500).json({ error: 'Erreur lors de la complétion de la maintenance' });
  }
};

exports.getPlanning = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const where = {
      status: {
        in: ['PLANIFIEE', 'EN_COURS']
      }
    };

    if (dateDebut || dateFin) {
      where.dateDebut = {};
      if (dateDebut) where.dateDebut.gte = new Date(dateDebut);
      if (dateFin) where.dateDebut.lte = new Date(dateFin);
    }

    const maintenances = await prisma.maintenanceEquipement.findMany({
      where,
      orderBy: { dateDebut: 'asc' },
      include: {
        equipement: {
          select: {
            reference: true,
            nom: true,
            categorie: true,
            departement: true
          }
        }
      }
    });

    // Grouper par type
    const preventives = maintenances.filter(m => m.type === 'PREVENTIVE');
    const correctives = maintenances.filter(m => m.type === 'CORRECTIVE');

    res.json({
      total: maintenances.length,
      preventives: preventives.length,
      correctives: correctives.length,
      maintenances,
      parType: {
        preventives,
        correctives
      }
    });
  } catch (error) {
    console.error('Erreur récupération planning:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du planning' });
  }
};
