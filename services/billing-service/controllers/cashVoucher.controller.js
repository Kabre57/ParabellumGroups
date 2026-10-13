// Façade conservant les exports consommés par les routes HTTP.
module.exports = {
  ...require('./cashVoucher/queries.controller'),
  ...require('./cashVoucher/commands.controller'),
  ...require('./cashVoucher/imports.controller'),
  ...require('./cashVoucher/reporting.controller'),
};
