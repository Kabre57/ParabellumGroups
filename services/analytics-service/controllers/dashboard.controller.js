const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createDashboard = async (req, res) => {
  try {
    const { nom, description, config, actif, parDefaut } = req.body;
    const userId = req.user.id;

    if (parDefaut) {
      await prisma.dashboard.updateMany({
        where: { userId, parDefaut: true },
        data: { parDefaut: false }
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        nom,
        description,
        userId,
        config: config || {},
        actif: actif !== undefined ? actif : true,
        parDefaut: parDefaut || false
      },
      include: { widgets: true }
    });

    res.status(201).json(dashboard);
  } catch (error) {
    console.error('Erreur création dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la création du dashboard' });
  }
};

exports.getAllDashboards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { actif } = req.query;

    const where = { userId };
    if (actif !== undefined) {
      where.actif = actif === 'true';
    }

    const dashboards = await prisma.dashboard.findMany({
      where,
      include: { widgets: true },
      orderBy: [
        { parDefaut: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(dashboards);
  } catch (error) {
    console.error('Erreur récupération dashboards:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des dashboards' });
  }
};

exports.getDashboardById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id, userId },
      include: { widgets: true }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Erreur récupération dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du dashboard' });
  }
};

exports.updateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { nom, description, config, actif, parDefaut } = req.body;

    const existing = await prisma.dashboard.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    if (parDefaut) {
      await prisma.dashboard.updateMany({
        where: { userId, parDefaut: true, id: { not: id } },
        data: { parDefaut: false }
      });
    }

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: {
        nom,
        description,
        config,
        actif,
        parDefaut
      },
      include: { widgets: true }
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Erreur mise à jour dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du dashboard' });
  }
};

exports.deleteDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.dashboard.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    await prisma.dashboard.delete({
      where: { id }
    });

    res.json({ message: 'Dashboard supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du dashboard' });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id, userId },
      include: { widgets: true }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    const widgetsWithData = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        // Simuler la récupération de données pour chaque widget
        const data = await getWidgetData(widget);
        return { ...widget, data };
      })
    );

    res.json({
      ...dashboard,
      widgets: widgetsWithData
    });
  } catch (error) {
    console.error('Erreur récupération données dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
};

exports.duplicateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const original = await prisma.dashboard.findFirst({
      where: { id, userId },
      include: { widgets: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    const newDashboard = await prisma.dashboard.create({
      data: {
        nom: `${original.nom} (Copie)`,
        description: original.description,
        userId,
        config: original.config,
        actif: original.actif,
        parDefaut: false,
        widgets: {
          create: original.widgets.map(w => ({
            type: w.type,
            titre: w.titre,
            config: w.config,
            position: w.position,
            refresh: w.refresh
          }))
        }
      },
      include: { widgets: true }
    });

    res.status(201).json(newDashboard);
  } catch (error) {
    console.error('Erreur duplication dashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la duplication du dashboard' });
  }
};

exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.dashboard.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    await prisma.dashboard.updateMany({
      where: { userId, parDefaut: true },
      data: { parDefaut: false }
    });

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: { parDefaut: true },
      include: { widgets: true }
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Erreur définition dashboard par défaut:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du dashboard par défaut' });
  }
};

async function getWidgetData(widget) {
  // Logique de récupération des données selon le type de widget
  // À implémenter selon les besoins spécifiques
  return {
    type: widget.type,
    values: [],
    lastUpdate: new Date()
  };
}
