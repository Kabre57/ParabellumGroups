const ADMIN = require('./admin.template.js');
const EMPLOYEE = require('./employee.template.js');
const SERVICE_MANAGER = require('./service-manager.template.js');
const PURCHASING_MANAGER = require('./purchasing-manager.template.js');
const GERANT = require('./gerant.template.js');
const GENERAL_DIRECTOR = require('./general-director.template.js');
const ACCOUNTANT = require('./accountant.template.js');
const COMMERCIAL = require('./commercial.template.js');

const roleTemplates = {
  ADMIN,
  EMPLOYEE,
  SERVICE_MANAGER,
  PURCHASING_MANAGER,
  GERANT,
  GENERAL_DIRECTOR,
  ACCOUNTANT,
  COMMERCIAL,
};

module.exports = { roleTemplates };
