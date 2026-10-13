// Facade conservant les gestionnaires consommes par les routes.
module.exports = {
  ...require('./sequence/queries.controller'),
  ...require('./sequence/lifecycle.controller'),
  ...require('./sequence/steps.controller'),
};
