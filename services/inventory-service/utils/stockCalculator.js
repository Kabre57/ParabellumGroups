const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calcule la valeur totale du stock
 */
async function calculateStockValue(prixType = 'prixAchat') {
  const articles = await prisma.article.findMany({
    where: { status: 'ACTIF' }
  });

  return articles.reduce((total, article) => {
    return total + (article.quantiteStock * article[prixType]);
  }, 0);
}

/**
 * Calcule la valeur du stock par catégorie
 */
async function calculateStockValueByCategory(prixType = 'prixAchat') {
  const articles = await prisma.article.findMany({
    where: { status: 'ACTIF' }
  });

  const byCategory = {};
  
  articles.forEach(article => {
    const categorie = article.categorie;
    if (!byCategory[categorie]) {
      byCategory[categorie] = {
        valeur: 0,
        quantite: 0,
        nbArticles: 0
      };
    }
    
    byCategory[categorie].valeur += article.quantiteStock * article[prixType];
    byCategory[categorie].quantite += article.quantiteStock;
    byCategory[categorie].nbArticles += 1;
  });

  return byCategory;
}

/**
 * Calcule le stock moyen sur une période
 */
async function calculateAverageStock(articleId, days = 30) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);

  const mouvements = await prisma.mouvementStock.findMany({
    where: {
      articleId,
      dateOperation: {
        gte: dateDebut
      }
    },
    orderBy: {
      dateOperation: 'asc'
    }
  });

  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  let stockActuel = article.quantiteStock;
  let totalStock = stockActuel;
  let nbJours = 1;

  // Reconstituer l'historique du stock
  for (let i = mouvements.length - 1; i >= 0; i--) {
    const mouvement = mouvements[i];
    
    switch (mouvement.type) {
      case 'ENTREE':
        stockActuel -= mouvement.quantite;
        break;
      case 'SORTIE':
        stockActuel += mouvement.quantite;
        break;
      case 'AJUSTEMENT':
        // Pour les ajustements, on ne peut pas reconstituer facilement
        break;
    }
    
    totalStock += stockActuel;
    nbJours++;
  }

  return totalStock / nbJours;
}

/**
 * Calcule la rotation du stock
 */
async function calculateStockRotation(articleId, days = 365) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);

  const sorties = await prisma.mouvementStock.aggregate({
    where: {
      articleId,
      type: 'SORTIE',
      dateOperation: {
        gte: dateDebut
      }
    },
    _sum: {
      quantite: true
    }
  });

  const stockMoyen = await calculateAverageStock(articleId, days);
  
  if (stockMoyen === 0) return 0;
  
  const quantiteSortie = sorties._sum.quantite || 0;
  return quantiteSortie / stockMoyen;
}

module.exports = {
  calculateStockValue,
  calculateStockValueByCategory,
  calculateAverageStock,
  calculateStockRotation
};
