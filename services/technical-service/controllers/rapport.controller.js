// Facade conservant les gestionnaires attendus par les routes HTTP.
module.exports = {
  ...require('./rapport/queries.controller'),
  ...require('./rapport/lifecycle.controller'),
  ...require('./rapport/photos.controller'),
  ...require('./rapport/pdf.controller'),
};
