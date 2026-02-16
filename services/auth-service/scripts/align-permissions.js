const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transformPermissionName = (name) => {
  let next = name;

  if (next.startsWith('analytics.')) {
    next = next.replace(/^analytics\./, 'reports.');
  }

  if (next.endsWith('.view_all')) {
    next = next.replace(/\.view_all$/, '.read_all');
  } else if (next.endsWith('.view_assigned')) {
    next = next.replace(/\.view_assigned$/, '.read_assigned');
  } else if (next.endsWith('.view')) {
    next = next.replace(/\.view$/, '.read');
  }

  return next;
};

const transformCategory = (permission) => {
  if (permission.name.startsWith('analytics.')) {
    return 'reports';
  }
  return permission.category;
};

const mergeRolePermissionFlags = (target, source) => ({
  canView: target.canView || source.canView,
  canCreate: target.canCreate || source.canCreate,
  canEdit: target.canEdit || source.canEdit,
  canDelete: target.canDelete || source.canDelete,
  canApprove: target.canApprove || source.canApprove,
});

const mergeUserPermissionFlags = (target, source) => ({
  can_view: target.can_view || source.can_view,
  can_create: target.can_create || source.can_create,
  can_edit: target.can_edit || source.can_edit,
  can_delete: target.can_delete || source.can_delete,
  can_approve: target.can_approve || source.can_approve,
});

async function alignPermissions() {
  const alreadyApplied = await prisma.permission.findFirst({
    where: {
      name: { contains: '.view' }
    }
  });

  const hasLegacyAnalytics = await prisma.permission.findFirst({
    where: {
      name: { startsWith: 'analytics.' }
    }
  });

  if (!alreadyApplied && !hasLegacyAnalytics) {
    return { renamed: 0, merged: 0, skipped: true };
  }

  const permissions = await prisma.permission.findMany();
  let renamed = 0;
  let merged = 0;

  for (const permission of permissions) {
    const newName = transformPermissionName(permission.name);
    const newCategory = transformCategory(permission);

    if (newName === permission.name && newCategory === permission.category) {
      continue;
    }

    const target = await prisma.permission.findUnique({ where: { name: newName } });

    if (target && target.id !== permission.id) {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { permissionId: permission.id }
      });

      for (const rp of rolePerms) {
        const existing = await prisma.rolePermission.findUnique({
          where: { roleId_permissionId: { roleId: rp.roleId, permissionId: target.id } }
        });

        if (existing) {
          await prisma.rolePermission.update({
            where: { id: existing.id },
            data: mergeRolePermissionFlags(existing, rp)
          });
          await prisma.rolePermission.delete({ where: { id: rp.id } });
        } else {
          await prisma.rolePermission.update({
            where: { id: rp.id },
            data: { permissionId: target.id }
          });
        }
      }

      const userPerms = await prisma.userPermission.findMany({
        where: { permission_id: permission.id }
      });

      for (const up of userPerms) {
        const existing = await prisma.userPermission.findUnique({
          where: { user_id_permission_id: { user_id: up.user_id, permission_id: target.id } }
        });

        if (existing) {
          await prisma.userPermission.update({
            where: { id: existing.id },
            data: mergeUserPermissionFlags(existing, up)
          });
          await prisma.userPermission.delete({ where: { id: up.id } });
        } else {
          await prisma.userPermission.update({
            where: { id: up.id },
            data: { permission_id: target.id }
          });
        }
      }

      await prisma.permission.delete({ where: { id: permission.id } });
      merged += 1;
    } else {
      await prisma.permission.update({
        where: { id: permission.id },
        data: {
          name: newName,
          category: newCategory
        }
      });
      renamed += 1;
    }
  }

  const users = await prisma.user.findMany({
    where: { permissions: { not: null } },
    select: { id: true, permissions: true }
  });

  for (const user of users) {
    if (!user.permissions) continue;
    try {
      const parsed = JSON.parse(user.permissions);
      if (Array.isArray(parsed)) {
        const mapped = parsed.map((perm) => transformPermissionName(String(perm)));
        await prisma.user.update({
          where: { id: user.id },
          data: { permissions: JSON.stringify(mapped) }
        });
      }
    } catch {
      // ignore non-json payloads
    }
  }

  return { renamed, merged, skipped: false };
}

async function main() {
  try {
    const result = await alignPermissions();
    console.log('Align permissions done:', result);
  } catch (error) {
    console.error('Align permissions error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
