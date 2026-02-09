const axios = require('axios');

exports.getSalesStats = async (req, res) => {
  try {
    const { dateDebut, dateFin, groupBy = 'day' } = req.query;

    // Simuler l'appel aux services concernés (CRM, Ventes, etc.)
    const stats = {
      periode: { dateDebut, dateFin },
      chiffreAffaires: {
        total: 125000,
        variation: 12.5,
        tendance: 'UP'
      },
      nombreVentes: {
        total: 145,
        variation: 8.3,
        tendance: 'UP'
      },
      panierMoyen: {
        valeur: 862.07,
        variation: 3.8,
        tendance: 'UP'
      },
      tauxConversion: {
        valeur: 24.5,
        variation: -2.1,
        tendance: 'DOWN'
      },
      topProduits: [
        { id: 1, nom: 'Produit A', ventes: 45, ca: 45000 },
        { id: 2, nom: 'Produit B', ventes: 38, ca: 30400 },
        { id: 3, nom: 'Produit C', ventes: 32, ca: 25600 }
      ],
      ventesParCanal: {
        web: 65000,
        magasin: 40000,
        telephone: 20000
      },
      evolutionTemporelle: generateTimeSeriesData(dateDebut, dateFin, groupBy)
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats ventes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques de ventes' });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const { dateDebut, dateFin, statut } = req.query;

    const stats = {
      periode: { dateDebut, dateFin },
      nombreProjets: {
        total: 28,
        enCours: 12,
        termines: 14,
        enRetard: 2
      },
      tauxReussite: {
        valeur: 92.3,
        variation: 5.2,
        tendance: 'UP'
      },
      budgetTotal: {
        alloue: 850000,
        consomme: 720000,
        taux: 84.7
      },
      tempsTotal: {
        estime: 5600,
        realise: 5320,
        efficacite: 95.0
      },
      projetsCritiques: [
        { id: 1, nom: 'Projet Alpha', retard: 5, risque: 'HIGH' },
        { id: 2, nom: 'Projet Beta', retard: 2, risque: 'MEDIUM' }
      ],
      ressourcesUtilisation: {
        developpeurs: 85,
        designers: 70,
        chefsProjets: 90
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats projets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques de projets' });
  }
};

exports.getHRStats = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;

    const stats = {
      periode: { dateDebut, dateFin },
      effectifs: {
        total: 145,
        cdi: 120,
        cdd: 15,
        stagiaires: 10
      },
      turnover: {
        taux: 8.5,
        entrees: 12,
        sorties: 8,
        variation: -1.2
      },
      absences: {
        tauxAbsenteisme: 3.2,
        conges: 450,
        maladies: 120,
        autres: 30
      },
      formations: {
        nombre: 45,
        heures: 1200,
        budget: 85000,
        tauxParticipation: 78.5
      },
      satisfaction: {
        score: 7.8,
        variation: 0.3,
        tauxReponse: 82.0
      },
      recrutement: {
        postesOuverts: 8,
        candidatures: 156,
        entretiens: 24,
        embauches: 5
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats RH:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques RH' });
  }
};

exports.getFinanceStats = async (req, res) => {
  try {
    const { dateDebut, dateFin, type } = req.query;

    const stats = {
      periode: { dateDebut, dateFin },
      revenus: {
        total: 1250000,
        variation: 15.3,
        tendance: 'UP'
      },
      depenses: {
        total: 980000,
        variation: 8.7,
        tendance: 'UP'
      },
      resultat: {
        net: 270000,
        marge: 21.6,
        variation: 32.5
      },
      tresorerie: {
        disponible: 450000,
        variation: 12.8,
        joursCA: 45
      },
      comptesClients: {
        encours: 185000,
        enRetard: 35000,
        tauxRecouvrement: 94.5
      },
      comptesFournisseurs: {
        encours: 120000,
        enRetard: 15000,
        delaiMoyen: 42
      },
      budgetVsReel: {
        revenus: { budget: 1200000, reel: 1250000, ecart: 4.2 },
        depenses: { budget: 1000000, reel: 980000, ecart: -2.0 }
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats finances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques financières' });
  }
};

function generateTimeSeriesData(dateDebut, dateFin, groupBy) {
  const data = [];
  const start = dateDebut ? new Date(dateDebut) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = dateFin ? new Date(dateFin) : new Date();

  let current = new Date(start);
  while (current <= end) {
    data.push({
      date: current.toISOString().split('T')[0],
      valeur: Math.floor(Math.random() * 10000) + 5000
    });

    switch (groupBy) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }

  return data;
}

exports.getOverview = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    const now = new Date();
    let dateDebut, dateFin;
    
    if (startDate && endDate) {
      dateDebut = startDate;
      dateFin = endDate;
    } else {
      dateFin = now.toISOString().split('T')[0];
      const days = parseInt(period) || 30;
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      dateDebut = start.toISOString().split('T')[0];
    }
    
    const overview = {
      periode: { dateDebut, dateFin },
      revenue: 1250000,
      expenses: 980000,
      profit: 270000,
      margin: 21.6,
      active_missions: 12,
      users: 145,
      clients: 89,
      monthly_revenue: [85000, 92000, 78000, 105000, 98000, 115000, 125000, 118000, 132000, 128000, 145000, 155000],
      top_clients: [
        { name: 'Acme Corp', revenue: 185000 },
        { name: 'Tech Solutions', revenue: 142000 },
        { name: 'Global Services', revenue: 98000 },
        { name: 'Innova Labs', revenue: 76000 },
        { name: 'Digital Plus', revenue: 54000 }
      ],
      overdue_invoices: [
        { client: 'Retard SA', amount: 15000, days: 45 },
        { client: 'Delay Corp', amount: 8500, days: 32 },
        { client: 'Late Inc', amount: 12000, days: 28 }
      ],
      _source: 'analytics-service',
      _timestamp: new Date().toISOString(),
      _realData: false,
      _fallback: false
    };
    
    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Erreur recuperation overview:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recuperation des donnees overview' });
  }
};
