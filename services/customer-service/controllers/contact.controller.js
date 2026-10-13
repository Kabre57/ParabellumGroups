// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./contact/queries.controller'),
  ...require('./contact/lifecycle.controller'),
};
