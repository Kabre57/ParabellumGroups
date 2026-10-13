// Façade conservant les exports attendus par les routes HTTP du service technique.
module.exports = {
  ...require('./intervention/queries.controller'),
  ...require('./intervention/lifecycle.controller'),
  ...require('./intervention/resources.controller'),
};
