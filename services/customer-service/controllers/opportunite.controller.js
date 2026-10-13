// Fa?ade conservant les gestionnaires HTTP des opportunit?s.
module.exports = {
  ...require('./opportunite/queries.controller'),
  ...require('./opportunite/lifecycle.controller'),
  ...require('./opportunite/stages.controller'),
  ...require('./opportunite/products.controller'),
};
