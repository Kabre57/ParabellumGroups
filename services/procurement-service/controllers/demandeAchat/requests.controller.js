// Facade conservant les gestionnaires utilises par les routes HTTP.
module.exports = {
  ...require('./requests/queries.controller'),
  ...require('./requests/lifecycle.controller'),
  ...require('./requests/approval.controller'),
};
