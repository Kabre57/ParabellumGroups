const {
  permissionModules,
  completePermissions,
  permissionCatalog,
  getPermissionModules,
  getPermissionModule,
  getKnownPermissionNames,
  validatePermissionRegistry,
  assertValidPermissionRegistry,
} = require('./registry');
const { systemRoles } = require('./systemRoles');
const { roleTemplates } = require('./templates');
const { obsoletePermissionNames } = require('./obsoletePermissions');

module.exports = {
  permissionModules,
  completePermissions,
  permissionCatalog,
  getPermissionModules,
  getPermissionModule,
  getKnownPermissionNames,
  validatePermissionRegistry,
  assertValidPermissionRegistry,
  systemRoles,
  roleTemplates,
  obsoletePermissionNames,
};
