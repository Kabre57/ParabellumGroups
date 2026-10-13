// Facade conservant les gestionnaires HTTP utilises par les routes.
module.exports = {
  ...require('./bonCommande/queries.controller'),
  ...require('./bonCommande/creation.controller'),
  ...require('./bonCommande/lifecycle.controller'),
};
