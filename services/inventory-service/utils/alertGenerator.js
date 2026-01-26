const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Génère les alertes pour les articles en rupture ou proches de la rupture
 */
async function generateStockAlerts() {
  const articles = await prisma.article.findMany({
    where: {
      status: 'ACTIF'
    }
  });

  const alerts = {
    rupture: [],
    alerte: [],
    normal: []
  };

  articles.forEach(article => {
    if (article.quantiteStock <= article.seuilRupture) {
      alerts.rupture.push({
        ...article,
        niveau: 'CRITIQUE',
        message: `Article en rupture de stock (${article.quantiteStock} ${article.unite})`
      });
    } else if (article.quantiteStock <= article.seuilAlerte) {
      alerts.alerte.push({
        ...article,
        niveau: 'ATTENTION',
        message: `Stock faible (${article.quantiteStock} ${article.unite}, seuil: ${article.seuilAlerte})`
      });
    } else {
      alerts.normal.push(article);
    }
  });

  return alerts;
}

/**
 * Vérifie si un article nécessite une alerte
 */
async function checkArticleAlert(articleId) {
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article || article.status !== 'ACTIF') {
    return null;
  }

  if (article.quantiteStock <= article.seuilRupture) {
    return {
      niveau: 'CRITIQUE',
      type: 'RUPTURE',
      message: `Article en rupture de stock (${article.quantiteStock} ${article.unite})`,
      article
    };
  } else if (article.quantiteStock <= article.seuilAlerte) {
    return {
      niveau: 'ATTENTION',
      type: 'ALERTE',
      message: `Stock faible (${article.quantiteStock} ${article.unite}, seuil: ${article.seuilAlerte})`,
      article
    };
  }

  return {
    niveau: 'NORMAL',
    type: 'OK',
    message: 'Stock normal',
    article
  };
}

/**
 * Génère un rapport de stock avec alertes
 */
async function generateStockReport() {
  const alerts = await generateStockAlerts();
  const totalArticles = await prisma.article.count({
    where: { status: 'ACTIF' }
  });

  return {
    date: new Date(),
    totalArticles,
    nbRuptures: alerts.rupture.length,
    nbAlertes: alerts.alerte.length,
    nbNormal: alerts.normal.length,
    tauxDisponibilite: ((alerts.normal.length / totalArticles) * 100).toFixed(2),
    alerts
  };
}

module.exports = {
  generateStockAlerts,
  checkArticleAlert,
  generateStockReport
};
