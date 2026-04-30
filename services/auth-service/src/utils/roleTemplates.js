const prisma = require('../config/database');


// Définir les modèles comme une liste de codes d'autorisation ou d'objets d'autorisation complète
// Le caractère générique '*' signifie accorder toutes les autorisations
const { roleTemplates } = require('../permissions/templates');

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
