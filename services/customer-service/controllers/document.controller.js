// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./document/queries.controller'),
  ...require('./document/lifecycle.controller'),
};
