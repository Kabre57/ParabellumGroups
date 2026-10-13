// Façade conservant les exports consommés par les routes HTTP.
module.exports = {
  ...require('./devis/queries.controller.js'),
  ...require('./devis/management.controller.js'),
  ...require('./devis/responses.controller.js'),
  ...require('./devis/billing.controller.js'),
};
