// Façade publique conservant les imports utilisés par les routes.
module.exports = {
  ...require('./permission/queries.controller'),
  ...require('./permission/permissions.controller'),
  ...require('./permission/roleAssignments.controller'),
};
