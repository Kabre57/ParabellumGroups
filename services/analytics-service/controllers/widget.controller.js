const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createWidget = async (req, res) => {
  try {
    const { dashboardId, type, titre, config, position, refresh } = req.body;

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId }
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard non trouvé' });
    }

    if (dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const widget = await prisma.widget.create({
      data: {
        dashboardId,
        type,
        titre,
        config: config || {},
        position: position || {},
        refresh: refresh || 60
      }
    });

    res.status(201).json(widget);
  } catch (error) {
    console.error('Erreur création widget:', error);
    res.status(500).json({ error: 'Erreur lors de la création du widget' });
  }
};

exports.getAllWidgets = async (req, res) => {
  try {
    const { dashboardId } = req.query;

    if (!dashboardId) {
      return res.status(400).json({ error: 'dashboardId requis' });
    }

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId }
    });

    if (!dashboard || dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const widgets = await prisma.widget.findMany({
      where: { dashboardId },
      orderBy: { createdAt: 'asc' }
    });

    res.json(widgets);
  } catch (error) {
    console.error('Erreur récupération widgets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des widgets' });
  }
};

exports.getWidgetById = async (req, res) => {
  try {
    const { id } = req.params;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!widget) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (widget.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    res.json(widget);
  } catch (error) {
    console.error('Erreur récupération widget:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du widget' });
  }
};

exports.updateWidget = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, titre, config, position, refresh } = req.body;

    const existing = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (existing.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const widget = await prisma.widget.update({
      where: { id },
      data: {
        type,
        titre,
        config,
        position,
        refresh
      }
    });

    res.json(widget);
  } catch (error) {
    console.error('Erreur mise à jour widget:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du widget' });
  }
};

exports.deleteWidget = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (existing.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    await prisma.widget.delete({
      where: { id }
    });

    res.json({ message: 'Widget supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression widget:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du widget' });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    const existing = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (existing.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const widget = await prisma.widget.update({
      where: { id },
      data: { position }
    });

    res.json(widget);
  } catch (error) {
    console.error('Erreur mise à jour position:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la position' });
  }
};

exports.getData = async (req, res) => {
  try {
    const { id } = req.params;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!widget) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (widget.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const data = await fetchWidgetData(widget);

    res.json({ widget, data });
  } catch (error) {
    console.error('Erreur récupération données widget:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { id } = req.params;

    const widget = await prisma.widget.findUnique({
      where: { id },
      include: { dashboard: true }
    });

    if (!widget) {
      return res.status(404).json({ error: 'Widget non trouvé' });
    }

    if (widget.dashboard.userId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const data = await fetchWidgetData(widget, true);

    res.json({
      widget,
      data,
      refreshedAt: new Date()
    });
  } catch (error) {
    console.error('Erreur rafraîchissement widget:', error);
    res.status(500).json({ error: 'Erreur lors du rafraîchissement du widget' });
  }
};

async function fetchWidgetData(widget, forceRefresh = false) {
  // Logique de récupération des données selon le type et la configuration
  const { type, config } = widget;

  switch (type) {
    case 'CHART':
      return {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
        datasets: [{
          label: config.label || 'Données',
          data: [12, 19, 3, 5, 2, 3]
        }]
      };
    case 'TABLE':
      return {
        headers: config.headers || ['Col1', 'Col2'],
        rows: []
      };
    case 'KPI':
      return {
        value: 0,
        target: config.target || 100,
        unit: config.unit || ''
      };
    case 'MAP':
      return {
        markers: []
      };
    default:
      return {};
  }
}
