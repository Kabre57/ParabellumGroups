// Façade conservant les exports consommés par les routes HTTP.
module.exports = {
  ...require('./prospect/prospects.controller'),
  ...require('./prospect/activities.controller'),
  ...require('./prospect/campaigns.controller'),
  ...require('./prospect/related.controller'),
};
