// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./secteur/queries.controller'),
  ...require('./secteur/hierarchy.controller'),
  ...require('./secteur/lifecycle.controller'),
};
