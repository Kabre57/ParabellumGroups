const fs = require('node:fs');
const path = require('node:path');

const modulesDirectory = path.join(__dirname, 'modules');

const clonePermissionGroup = (group) => ({
  label: group.label,
  permissions: group.permissions.map((permission) => ({ ...permission })),
});

const normalizePermissionModule = (moduleConfig, fileName) => {
  if (!moduleConfig || typeof moduleConfig !== 'object') {
    throw new Error(`Invalid permission module in ${fileName}`);
  }

  const key = String(moduleConfig.key || '').trim();
  if (!key) {
    throw new Error(`Permission module ${fileName} must define a key`);
  }

  const groups = moduleConfig.groups && typeof moduleConfig.groups === 'object'
    ? moduleConfig.groups
    : {};

  return {
    key,
    label: moduleConfig.label || key,
    menuLabel: moduleConfig.menuLabel || moduleConfig.label || key,
    version: moduleConfig.version || '1.0.0',
    order: Number.isFinite(moduleConfig.order) ? moduleConfig.order : 999,
    description: moduleConfig.description || '',
    groups,
    groupKeys: Object.keys(groups),
    sourceFile: fileName,
  };
};

const loadPermissionModules = () => {
  const files = fs
    .readdirSync(modulesDirectory)
    .filter((fileName) => fileName.endsWith('.permissions.js'))
    .sort();

  return files
    .map((fileName) => {
      const modulePath = path.join(modulesDirectory, fileName);
      return normalizePermissionModule(require(modulePath), fileName);
    })
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
};

const buildCompletePermissions = (modules) => {
  const categories = {};

  for (const moduleConfig of modules) {
    for (const [groupKey, group] of Object.entries(moduleConfig.groups)) {
      categories[groupKey] = clonePermissionGroup(group);
    }
  }

  return categories;
};

const buildPermissionCatalog = (modules) =>
  modules.flatMap((moduleConfig) =>
    Object.entries(moduleConfig.groups).flatMap(([category, group]) =>
      group.permissions.map((permission) => ({
        ...permission,
        category,
        categoryLabel: group.label,
        moduleKey: moduleConfig.key,
        moduleLabel: moduleConfig.label,
        moduleVersion: moduleConfig.version,
      }))
    )
  );

const validatePermissionRegistry = (modules = permissionModules) => {
  const errors = [];
  const warnings = [];
  const moduleKeys = new Set();
  const categoryKeys = new Set();
  const permissionNames = new Set();
  let categoryCount = 0;
  let permissionCount = 0;

  for (const moduleConfig of modules) {
    if (moduleKeys.has(moduleConfig.key)) {
      errors.push(`Duplicate permission module key: ${moduleConfig.key}`);
    }
    moduleKeys.add(moduleConfig.key);

    if (!moduleConfig.groupKeys.length) {
      warnings.push(`Permission module ${moduleConfig.key} has no groups`);
    }

    for (const [category, group] of Object.entries(moduleConfig.groups)) {
      categoryCount++;

      if (categoryKeys.has(category)) {
        errors.push(`Duplicate permission category: ${category}`);
      }
      categoryKeys.add(category);

      if (!group.label) {
        errors.push(`Permission category ${category} must define a label`);
      }

      if (!Array.isArray(group.permissions)) {
        errors.push(`Permission category ${category} must define a permissions array`);
        continue;
      }

      for (const permission of group.permissions) {
        permissionCount++;
        const name = String(permission?.name || '').trim();

        if (!name) {
          errors.push(`Permission category ${category} contains a permission without name`);
          continue;
        }

        if (permissionNames.has(name)) {
          errors.push(`Duplicate permission name: ${name}`);
        }
        permissionNames.add(name);

        if (!permission.description) {
          warnings.push(`Permission ${name} has no description`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    moduleCount: moduleKeys.size,
    categoryCount,
    permissionCount,
  };
};

const assertValidPermissionRegistry = () => {
  const summary = validatePermissionRegistry();
  if (!summary.valid) {
    throw new Error(`Invalid permission registry:\n${summary.errors.join('\n')}`);
  }

  return summary;
};

const permissionModules = loadPermissionModules();
const completePermissions = buildCompletePermissions(permissionModules);
const permissionCatalog = buildPermissionCatalog(permissionModules);

const getPermissionModules = () =>
  permissionModules.map((moduleConfig) => ({
    key: moduleConfig.key,
    label: moduleConfig.label,
    menuLabel: moduleConfig.menuLabel,
    version: moduleConfig.version,
    order: moduleConfig.order,
    description: moduleConfig.description,
    categories: Object.entries(moduleConfig.groups).map(([key, group]) => ({
      key,
      label: group.label,
      permissionCount: group.permissions.length,
    })),
  }));

const getPermissionModule = (moduleKey) =>
  getPermissionModules().find((moduleConfig) => moduleConfig.key === moduleKey) || null;

const getKnownPermissionNames = () => permissionCatalog.map((permission) => permission.name);

module.exports = {
  permissionModules,
  completePermissions,
  permissionCatalog,
  getPermissionModules,
  getPermissionModule,
  getKnownPermissionNames,
  validatePermissionRegistry,
  assertValidPermissionRegistry,
};
