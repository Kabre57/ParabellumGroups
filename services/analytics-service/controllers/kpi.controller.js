const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createKPI = async (req, res) => {
  try {
    const { nom, description, categorie, valeur, cible, unite, tendance, variation } = req.body;

    const kpi = await prisma.kPI.create({
      data: {
        nom,
        description,
        categorie,
        valeur,
        cible,
        unite,
        tendance: tendance || 'STABLE',
        variation: variation || 0
      }
    });

    res.status(201).json(kpi);
  } catch (error) {
    console.error('Erreur création KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la création du KPI' });
  }
};

exports.getAllKPIs = async (req, res) => {
  try {
    const { categorie, dateDebut, dateFin } = req.query;

    const where = {};
    if (categorie) where.categorie = categorie;
    if (dateDebut || dateFin) {
      where.dateCalcul = {};
      if (dateDebut) where.dateCalcul.gte = new Date(dateDebut);
      if (dateFin) where.dateCalcul.lte = new Date(dateFin);
    }

    const kpis = await prisma.kPI.findMany({
      where,
      orderBy: { dateCalcul: 'desc' }
    });

    res.json(kpis);
  } catch (error) {
    console.error('Erreur récupération KPIs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des KPIs' });
  }
};

exports.getKPIById = async (req, res) => {
  try {
    const { id } = req.params;

    const kpi = await prisma.kPI.findUnique({
      where: { id }
    });

    if (!kpi) {
      return res.status(404).json({ error: 'KPI non trouvé' });
    }

    res.json(kpi);
  } catch (error) {
    console.error('Erreur récupération KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du KPI' });
  }
};

exports.updateKPI = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, categorie, valeur, cible, unite, tendance, variation } = req.body;

    const existing = await prisma.kPI.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'KPI non trouvé' });
    }

    const kpi = await prisma.kPI.update({
      where: { id },
      data: {
        nom,
        description,
        categorie,
        valeur,
        cible,
        unite,
        tendance,
        variation
      }
    });

    res.json(kpi);
  } catch (error) {
    console.error('Erreur mise à jour KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du KPI' });
  }
};

exports.deleteKPI = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.kPI.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'KPI non trouvé' });
    }

    await prisma.kPI.delete({
      where: { id }
    });

    res.json({ message: 'KPI supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du KPI' });
  }
};

exports.calculate = async (req, res) => {
  try {
    const { nom, categorie, parametres } = req.body;

    // Logique de calcul du KPI
    const { valeur, cible } = await calculateKPIValue(categorie, parametres);

    const previousKPI = await prisma.kPI.findFirst({
      where: { nom, categorie },
      orderBy: { dateCalcul: 'desc' }
    });

    let tendance = 'STABLE';
    let variation = 0;

    if (previousKPI) {
      variation = ((valeur - previousKPI.valeur) / previousKPI.valeur) * 100;
      tendance = variation > 0 ? 'UP' : variation < 0 ? 'DOWN' : 'STABLE';
    }

    const kpi = await prisma.kPI.create({
      data: {
        nom,
        categorie,
        valeur,
        cible,
        unite: parametres.unite || '',
        tendance,
        variation
      }
    });

    res.json(kpi);
  } catch (error) {
    console.error('Erreur calcul KPI:', error);
    res.status(500).json({ error: 'Erreur lors du calcul du KPI' });
  }
};

exports.compare = async (req, res) => {
  try {
    const { id } = req.params;
    const { compareToId } = req.query;

    const kpi = await prisma.kPI.findUnique({
      where: { id }
    });

    if (!kpi) {
      return res.status(404).json({ error: 'KPI non trouvé' });
    }

    let compareKPI;
    if (compareToId) {
      compareKPI = await prisma.kPI.findUnique({
        where: { id: compareToId }
      });
    } else {
      compareKPI = await prisma.kPI.findFirst({
        where: {
          nom: kpi.nom,
          categorie: kpi.categorie,
          id: { not: id }
        },
        orderBy: { dateCalcul: 'desc' }
      });
    }

    if (!compareKPI) {
      return res.status(404).json({ error: 'Aucun KPI de comparaison trouvé' });
    }

    const difference = kpi.valeur - compareKPI.valeur;
    const pourcentage = ((difference / compareKPI.valeur) * 100).toFixed(2);

    res.json({
      current: kpi,
      compare: compareKPI,
      difference,
      pourcentage: parseFloat(pourcentage),
      amelioration: difference > 0
    });
  } catch (error) {
    console.error('Erreur comparaison KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la comparaison du KPI' });
  }
};

exports.getTrend = async (req, res) => {
  try {
    const { nom, categorie } = req.query;
    const { periode = 30 } = req.query;

    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - parseInt(periode));

    const kpis = await prisma.kPI.findMany({
      where: {
        nom,
        categorie,
        dateCalcul: {
          gte: dateDebut
        }
      },
      orderBy: { dateCalcul: 'asc' }
    });

    if (kpis.length === 0) {
      return res.status(404).json({ error: 'Aucun KPI trouvé pour cette période' });
    }

    const trend = {
      nom,
      categorie,
      periode,
      dataPoints: kpis.map(k => ({
        date: k.dateCalcul,
        valeur: k.valeur,
        cible: k.cible,
        variation: k.variation
      })),
      moyenne: kpis.reduce((sum, k) => sum + k.valeur, 0) / kpis.length,
      min: Math.min(...kpis.map(k => k.valeur)),
      max: Math.max(...kpis.map(k => k.valeur)),
      tendanceGlobale: kpis[kpis.length - 1].tendance
    };

    res.json(trend);
  } catch (error) {
    console.error('Erreur récupération tendance KPI:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la tendance' });
  }
};

async function calculateKPIValue(categorie, parametres) {
  // Logique de calcul selon la catégorie
  // À implémenter selon les besoins spécifiques
  return {
    valeur: Math.random() * 100,
    cible: 100
  };
}
