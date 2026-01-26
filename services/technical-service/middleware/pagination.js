/**
 * Middleware pour convertir les paramètres de pagination du frontend (pageSize)
 * vers les paramètres attendus par le backend (page, limit)
 */
exports.convertPagination = (req, res, next) => {
  // Si le frontend envoie pageSize, on le convertit
  if (req.query.pageSize) {
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    
    req.query.limit = pageSize;
    req.query.page = page;
    
    // Supprimer pageSize pour éviter la duplication
    delete req.query.pageSize;
  }
  
  // Convertir d'autres paramètres si nécessaire
  if (req.query.search) {
    req.query.search = req.query.search.trim();
  }
  
  next();
};

/**
 * Middleware pour formater la réponse paginée
 */
exports.formatPaginationResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Si la réponse contient des données paginées, formater
    if (data && data.data && data.page !== undefined) {
      data.pagination = {
        page: data.page,
        limit: data.limit,
        total: data.total,
        pages: data.pages
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};