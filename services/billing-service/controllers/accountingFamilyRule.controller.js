// Façade conservant les exports consommés par les routes HTTP.
module.exports = {
  ...require('./accountingFamilyRule/queries.controller'),
  ...require('./accountingFamilyRule/families.controller'),
  ...require('./accountingFamilyRule/rules.controller'),
};
