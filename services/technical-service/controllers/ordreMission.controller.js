// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./ordreMission/queries.controller'),
  ...require('./ordreMission/lifecycle.controller'),
  ...require('./ordreMission/pdf.controller'),
};
