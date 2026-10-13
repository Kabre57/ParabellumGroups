// Facade conservant les gestionnaires utilises par les routes HTTP.
module.exports = {
  ...require('./proformas/creation.controller'),
  ...require('./proformas/workflow.controller'),
};
