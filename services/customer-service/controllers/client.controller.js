// Façade conservant les exports consommés par les routes HTTP.
module.exports = {
  ...require('./client/queries.controller'),
  ...require('./client/import.controller'),
  ...require('./client/lifecycle.controller'),
  ...require('./client/reporting.controller'),
};
