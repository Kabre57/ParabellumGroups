// Façade publique conservant les imports utilisés par les routes.
module.exports = {
  ...require('./user/queries.controller'),
  ...require('./user/accounts.controller'),
  ...require('./user/status.controller'),
};
