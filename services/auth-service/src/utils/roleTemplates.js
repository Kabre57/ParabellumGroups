const prisma = require('../config/database');


// Définir les modèles comme une liste de codes d'autorisation ou d'objets d'autorisation complète
// Le caractère générique '*' signifie accorder toutes les autorisations
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
    'purchase_requests.read_committee',
    'purchase_requests.create',
    'purchase_requests.update',
    'purchase_requests.delete',
    'purchase_requests.evaluate_committee',
    'purchase_requests.recommend_supplier',
    'purchase_requests.export_committee',
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
    'billing.dashboard.read',
    'credit_notes.read',
    'reports.read',
    'reports.read_financial',
    'reports.export',
    'accounting.read',
    'accounting.periods.manage',
    'accounting.journals.manage',
    'accounting.rules.read',
    'accounting.diagnostics.read',
    'users.read',
    'roles.read',
    'permissions.read',
    'purchase_requests.read',
    'purchase_requests.read_all',
    'purchase_requests.read_committee',
    'purchase_requests.approve',
    'purchase_requests.evaluate_committee',
    'purchase_requests.export_committee',
    'purchases.read',
    'purchases.read_all',
    'services.read',
    'services.read_all',
    'notifications.read',
    'notifications.read_own',
  ],
  ACCOUNTANT: [
    'enterprises.read',
    'enterprises.read_all',
    'dashboard.read',
    'dashboard.read_analytics',
    'expenses.read',
    'expenses.read_all',
    'expenses.create',
    'expenses.import',
    'expenses.update',
    'expenses.approve',
    'payments.create',
    'payments.update',
    'payments.validate',
    'reports.read_financial',
    'reports.export',
    'accounting.read',
    'accounting.accounts.manage',
    'accounting.periods.manage',
    'accounting.journals.manage',
    'accounting.rules.read',
    'accounting.rules.update',
    'accounting.entries.create',
    'accounting.treasury.manage',
    'accounting.diagnostics.read',
    'services.read',
    'services.read_all',
    'notifications.read',
    'notifications.read_own',
  ],
  COMMERCIAL: [
    'dashboard.read',
    'dashboard.read_analytics',
    'services.read',
    'services.read_all',
    'prospects.read',
    'prospects.read_all',
    'prospects.read_own',
    'prospects.create',
    'prospects.update',
    'prospects.delete',
    'prospects.assign',
    'prospects.convert',
    'prospects.manage_activities',
    'prospects.export',
    'prospects.import',
    'opportunities.read',
    'opportunities.read_all',
    'opportunities.read_own',
    'opportunities.create',
    'opportunities.update',
    'opportunities.delete',
    'opportunities.assign',
    'opportunities.change_stage',
    'opportunities.export',
    'customers.read',
    'customers.read_all',
    'customers.read_assigned',
    'customers.create',
    'customers.update',
    'customers.manage_contacts',
    'customers.manage_addresses',
    'customers.manage_documents',
    'customers.export',
    'quotes.read',
    'quotes.read_all',
    'quotes.read_own',
    'quotes.create',
    'quotes.update',
    'quotes.delete',
    'quotes.send',
    'quotes.approve',
    'quotes.convert',
    'quotes.print',
    'quotes.export',
    'emails.read',
    'emails.send',
    'emails.send_bulk',
    'emails.manage_templates',
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

const roleTemplateFlagKeys = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'];

const mergeFlags = (flags = {}) => ({
  ...fullAccessFlags,
  ...Object.fromEntries(
    roleTemplateFlagKeys.map((key) => [key, flags[key] !== undefined ? Boolean(flags[key]) : fullAccessFlags[key]])
  ),
});

const normalizeTemplateEntry = (entry) => {
  if (typeof entry === 'string') {
    return entry === '*'
      ? { wildcard: true }
      : { permissionName: entry, flags: { ...fullAccessFlags } };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const permissionName = String(entry.permissionName || entry.name || entry.permission || '').trim();
  if (!permissionName) {
    return null;
  }

  const explicitFlags = entry.flags && typeof entry.flags === 'object' ? entry.flags : entry;

  return {
    permissionName,
    flags: mergeFlags(explicitFlags),
  };
};

const hasRoleTemplateTables = async () => {
  const [result] = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'role_template_permissions'
    ) AS "exists"
  `);

  return Boolean(result?.exists);
};

const loadDatabaseTemplate = async (roleCode) => {
  const tablesAvailable = await hasRoleTemplateTables().catch(() => false);
  if (!tablesAvailable) {
    return null;
  }

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        rtp.permission_name AS "permissionName",
        rtp.can_view AS "canView",
        rtp.can_create AS "canCreate",
        rtp.can_edit AS "canEdit",
        rtp.can_delete AS "canDelete",
        rtp.can_approve AS "canApprove"
      FROM role_template_permissions rtp
      INNER JOIN role_template_configs rtc ON rtc.id = rtp.template_config_id
      WHERE rtc.role_code = $1
        AND rtc.is_active = true
      ORDER BY rtp.id ASC
    `,
    roleCode
  ).catch(() => []);

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows.map((row) => normalizeTemplateEntry(row)).filter(Boolean);
};

const getTemplateEntries = async (roleCode) => {
  const databaseTemplate = await loadDatabaseTemplate(roleCode);
  if (databaseTemplate?.length) {
    return databaseTemplate;
  }

  const template = roleTemplates[roleCode];
  if (!template) {
    return [];
  }

  return template.map(normalizeTemplateEntry).filter(Boolean);
};

/**
 * Apply a template to a role identified by code.
 * Grants permissions defined in the template by upserting role_permissions.
 */
async function applyTemplate(roleCode, options = {}) {
  const { dryRun = false, replace = false, logger = console } = options;
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return { roleCode, applied: false, reason: 'role_not_found', dryRun };
  }

  const templateEntries = await getTemplateEntries(roleCode);
  if (!templateEntries.length) {
    return { roleCode, applied: false, reason: 'template_not_found', dryRun };
  }

  const hasWildcard = templateEntries.some((entry) => entry.wildcard);
  const requestedPermissionNames = hasWildcard
    ? []
    : [...new Set(templateEntries.map((entry) => entry.permissionName))];

  const permissions = hasWildcard
    ? await prisma.permission.findMany({
        select: { id: true, name: true },
      })
    : await prisma.permission.findMany({
        where: { name: { in: requestedPermissionNames } },
        select: { id: true, name: true },
      });

  const permissionsByName = new Map(permissions.map((permission) => [permission.name, permission]));
  const missingPermissions = hasWildcard
    ? []
    : requestedPermissionNames.filter((name) => !permissionsByName.has(name));

  if (missingPermissions.length) {
    logger.warn?.(
      `[applyTemplate] Permissions absentes pour ${roleCode}: ${missingPermissions.join(', ')}`
    );
  }

  const desiredEntries = hasWildcard
    ? permissions.map((permission) => ({
        permissionId: permission.id,
        permissionName: permission.name,
        flags: { ...fullAccessFlags },
      }))
    : templateEntries
        .filter((entry) => !entry.wildcard)
        .map((entry) => {
          const permission = permissionsByName.get(entry.permissionName);
          if (!permission) {
            return null;
          }
          return {
            permissionId: permission.id,
            permissionName: permission.name,
            flags: mergeFlags(entry.flags),
          };
        })
        .filter(Boolean);

  const existingRolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: role.id },
    select: {
      id: true,
      permissionId: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
    },
  });

  const existingByPermissionId = new Map(
    existingRolePermissions.map((rolePermission) => [rolePermission.permissionId, rolePermission])
  );
  const desiredPermissionIds = desiredEntries.map((entry) => entry.permissionId);
  const toCreate = [];
  const toUpdate = [];

  for (const entry of desiredEntries) {
    const existing = existingByPermissionId.get(entry.permissionId);
    if (!existing) {
      toCreate.push({
        roleId: role.id,
        permissionId: entry.permissionId,
        ...entry.flags,
      });
      continue;
    }

    const needsUpdate = roleTemplateFlagKeys.some((key) => Boolean(existing[key]) !== Boolean(entry.flags[key]));
    if (needsUpdate) {
      toUpdate.push({
        id: existing.id,
        ...entry.flags,
      });
    }
  }

  const toDelete = replace
    ? existingRolePermissions
        .filter((rolePermission) => !desiredPermissionIds.includes(rolePermission.permissionId))
        .map((rolePermission) => rolePermission.id)
    : [];

  const summary = {
    roleCode,
    roleId: role.id,
    dryRun,
    replace,
    missingPermissions,
    matchedPermissions: desiredEntries.length,
    wouldCreate: toCreate.length,
    wouldUpdate: toUpdate.length,
    wouldDelete: toDelete.length,
    applied: false,
  };

  if (dryRun) {
    return summary;
  }

  await prisma.$transaction(async (tx) => {
    if (replace && toDelete.length) {
      await tx.rolePermission.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
    }

    if (toCreate.length) {
      await tx.rolePermission.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    for (const entry of toUpdate) {
      await tx.rolePermission.update({
        where: { id: entry.id },
        data: {
          canView: entry.canView,
          canCreate: entry.canCreate,
          canEdit: entry.canEdit,
          canDelete: entry.canDelete,
          canApprove: entry.canApprove,
        },
      });
    }
  });

  return {
    ...summary,
    applied: true,
  };
}

module.exports = { roleTemplates, applyTemplate, fullAccessFlags, mergeFlags };
