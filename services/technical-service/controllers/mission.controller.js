// Façade conservant les gestionnaires publics consommés par les routes HTTP.
module.exports = {
  ...require('./mission/queries.controller'),
  ...require('./mission/lifecycle.controller'),
  ...require('./mission/assignment.controller'),
  ...require('./mission/documents.controller'),
  ...require('./mission/synchronization.controller'),
  ...require('./mission/reporting.controller'),
};
