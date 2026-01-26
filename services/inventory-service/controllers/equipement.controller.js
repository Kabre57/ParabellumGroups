const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createEquipement = async (req, res) => {
  try {
    const equipement = await prisma.equipement.create({
      data: req.body
    });
    res.status(201).json(equipement);
  } catch (error) {
    console.error('Erreur création équipement:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'équipement' });
  }
};

exports.getAllEquipements = async (req, res) => {
  try {
    const { status, categorie, departement } = req.query;
    const where = {};

    if (status) where.status = status;
    if (categorie) where.categorie = categorie;
    if (departement) where.departement = departement;

    const equipements = await prisma.equipement.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(equipements);
  } catch (error) {
    console.error('Erreur récupération équipements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des équipements' });
  }
};

exports.getEquipementById = async (req, res) => {
  try {
    const equipement = await prisma.equipement.findUnique({
      where: { id: req.params.id },
      include: {
        maintenances: {
          orderBy: { dateDebut: 'desc' }
        }
      }
    });
    
    if (!equipement) {
      return res.status(404).json({ error: 'Équipement non trouvé' });
    }
    
    res.json(equipement);
  } catch (error) {
    console.error('Erreur récupération équipement:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'équipement' });
  }
};

exports.updateEquipement = async (req, res) => {
  try {
    const equipement = await prisma.equipement.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(equipement);
  } catch (error) {
    console.error('Erreur mise à jour équipement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'équipement' });
  }
};

exports.deleteEquipement = async (req, res) => {
  try {
    await prisma.equipement.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression équipement:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'équipement' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const equipement = await prisma.equipement.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(equipement);
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};

exports.getMaintenance = async (req, res) => {
  try {
    const maintenances = await prisma.maintenanceEquipement.findMany({
      where: { equipementId: req.params.id },
      orderBy: { dateDebut: 'desc' }
    });
    res.json(maintenances);
  } catch (error) {
    console.error('Erreur récupération maintenances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des maintenances' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total = await prisma.equipement.count();
    const disponible = await prisma.equipement.count({ where: { status: 'DISPONIBLE' } });
    const enService = await prisma.equipement.count({ where: { status: 'EN_SERVICE' } });
    const enPanne = await prisma.equipement.count({ where: { status: 'EN_PANNE' } });
    const enMaintenance = await prisma.equipement.count({ where: { status: 'EN_MAINTENANCE' } });
    const reforme = await prisma.equipement.count({ where: { status: 'REFORME' } });

    const equipements = await prisma.equipement.findMany();
    const valeurTotale = equipements.reduce((sum, e) => sum + e.valeurAchat, 0);

    const maintenancesEnCours = await prisma.maintenanceEquipement.count({
      where: { status: 'EN_COURS' }
    });

    res.json({
      total,
      parStatus: {
        disponible,
        enService,
        enPanne,
        enMaintenance,
        reforme
      },
      valeurTotale,
      maintenancesEnCours,
      tauxDisponibilite: total > 0 ? ((disponible + enService) / total * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};
