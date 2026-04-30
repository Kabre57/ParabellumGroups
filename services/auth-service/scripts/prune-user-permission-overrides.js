const { PrismaClient } = require('@prisma/client');
const {
  normalizeFlags,
  computeMeaningfulOverride,
} = require('../src/utils/userPermissionOverrides');

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          rolePermissions: true,
        },
      },
      user_permissions: {
        include: {
          permissions: true,
        },
      },
    },
  });

  let deleted = 0;
  let kept = 0;

  for (const user of users) {
    const rolePermissionsByPermissionId = new Map(
      (user.role?.rolePermissions || []).map((permission) => [
        permission.permissionId,
        normalizeFlags(permission),
      ])
    );

    for (const override of user.user_permissions || []) {
      const roleFlags = rolePermissionsByPermissionId.get(override.permission_id) || null;
      const meaningfulOverride = computeMeaningfulOverride({
        roleFlags,
        userFlags: {
          canView: override.can_view,
          canCreate: override.can_create,
          canEdit: override.can_edit,
          canDelete: override.can_delete,
          canApprove: override.can_approve,
        },
      });

      if (!meaningfulOverride) {
        if (dryRun) {
          console.log(
            `[dry-run] suppression override redondant: user=${user.email} permission=${override.permissions?.name}`
          );
        } else {
          await prisma.userPermission.delete({
            where: { id: override.id },
          });
        }
        deleted += 1;
        continue;
      }

      const needsUpdate =
        meaningfulOverride.canView !== Boolean(override.can_view) ||
        meaningfulOverride.canCreate !== Boolean(override.can_create) ||
        meaningfulOverride.canEdit !== Boolean(override.can_edit) ||
        meaningfulOverride.canDelete !== Boolean(override.can_delete) ||
        meaningfulOverride.canApprove !== Boolean(override.can_approve);

      if (needsUpdate) {
        if (dryRun) {
          console.log(
            `[dry-run] normalisation override: user=${user.email} permission=${override.permissions?.name}`
          );
        } else {
          await prisma.userPermission.update({
            where: { id: override.id },
            data: {
              can_view: meaningfulOverride.canView,
              can_create: meaningfulOverride.canCreate,
              can_edit: meaningfulOverride.canEdit,
              can_delete: meaningfulOverride.canDelete,
              can_approve: meaningfulOverride.canApprove,
              updated_at: new Date(),
            },
          });
        }
      }

      kept += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        users: users.length,
        deleted,
        kept,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('Erreur nettoyage overrides utilisateur:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
