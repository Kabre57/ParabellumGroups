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
  PURCHASING_MANAGER: [
    'dashboard.read',
    'dashboard.read_analytics',
    'services.read',
    'services.read_all',
    'purchases.read',
    'purchases.create',
    'purchases.submit',
    'purchases.update',
    'purchases.delete',
    'purchase_requests.read',
    'purchase_requests.read_all',
    'purchase_requests.read_own',
    'purchase_requests.create',
    'purchase_requests.update',
    'purchase_requests.delete',
    'purchase_orders.read',
    'purchase_orders.create',
    'purchase_orders.update',
    'purchase_orders.send',
    'purchase_orders.approve',
    'purchase_orders.receive',
    'purchase_orders.cancel',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'suppliers.delete',
    'suppliers.evaluate',
    'suppliers.export',
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'products.manage_categories',
    'products.manage_pricing',
    'products.export',
    'products.import',
    'inventory.read',
    'inventory.read_all',
    'inventory.read_warehouse',
    'inventory.create',
    'inventory.update',
    'inventory.adjust',
    'inventory.transfer',
    'inventory.count',
    'inventory.export',
    'stock_movements.read',
    'stock_movements.create',
    'stock_movements.update',
    'stock_movements.delete',
    'stock_movements.validate',
    'warehouses.read',
    'warehouses.create',
    'warehouses.update',
    'warehouses.delete',
    'notifications.read',
    'notifications.read_own',
  ],
  GENERAL_DIRECTOR: [
    'dashboard.read',
    'dashboard.read_analytics',
    'purchase_requests.read',
    'purchase_requests.read_all',
    'purchase_requests.approve',
    'purchases.read',
    'purchases.read_all',
    'services.read',
    'services.read_all',
    'notifications.read',
    'notifications.read_own',
  ],
  ACCOUNTANT: [
    'dashboard.read',
    'dashboard.read_analytics',
    'expenses.read',
    'expenses.read_all',
    'expenses.create',
    'expenses.update',
    'expenses.approve',
    'payments.read',
    'payments.read_all',
    'payments.create',
    'payments.update',
    'payments.validate',
    'invoices.read',
    'reports.read_financial',
    'services.read',
    'services.read_all',
    'notifications.read',
    'notifications.read_own',
  ],
};

const fullAccessFlags = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
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
        update: fullAccessFlags,
        create: {
          roleId: role.id,
          permissionId: perm.id,
          ...fullAccessFlags,
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
        update: fullAccessFlags,
        create: {
          roleId: role.id,
          permissionId: perm.id,
          ...fullAccessFlags,
        },
      });
    }
  }
}

module.exports = { roleTemplates, applyTemplate };
