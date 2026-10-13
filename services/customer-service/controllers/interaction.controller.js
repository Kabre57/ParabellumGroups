// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./interaction/queries.controller'),
  ...require('./interaction/lifecycle.controller'),
  ...require('./interaction/taskLink.controller'),
};
