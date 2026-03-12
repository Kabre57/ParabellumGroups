const prisma = require('../config/database');

// define templates as list of permission codes or full permission objects
// wildcard '*' means grant everything
const roleTemplates = {
  ADMIN: ['*'],
  EMPLOYEE: [
    'dashboard.view',
    'users.read_own',
    'services.read_own',
    'interventions.read',
    'interventions.create_report',
    'rapports_techniques.read_own',
    'rapports_techniques.create',
    'rapports_techniques.update',
  ],
  SERVICE_MANAGER: [
    'dashboard.view',
    'services.read',
    'users.read_team',
    // ...
  ],
  GENERAL_DIRECTOR: ['*'],
};

/**
 * Apply a template to a role identified by code.
 * Grants permissions defined in the template by upserting role_permissions.
 */
async function applyTemplate(roleCode) {
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) return;

  const template = roleTemplates[roleCode];
  if (!template) return;

  if (template.includes('*')) {
    // grant every permission currently in db
    const allPerms = await prisma.permission.findMany();
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  } else {
    for (const permName of template) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }
}

module.exports = { roleTemplates, applyTemplate };
