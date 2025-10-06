// backend/prisma/seed.ts
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertPermission(name: string, description: string) {
  // Adapter les champs selon ton modèle Permission
  // Hypothèse: Permission { id, name (unique), description? }
  return prisma.permission.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function upsertRolePermission(role: UserRole, permissionId: number, flags?: Partial<{
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean;
}>) {
  // Adapter selon ton schéma; Hypothèse: unique (role, permissionId)
  const defaults = { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
  const data = { ...defaults, ...(flags || {}) };

  // Si ton modèle s'appelle RolePermission et possède un unique composite (role, permissionId)
  return prisma.rolePermission.upsert({
    where: {
      // Remplace par ta contrainte unique exacte si différente:
      role_permission_unique: { role, permissionId } as any,
    },
    update: data,
    create: { role, permissionId, ...data },
  });
}

async function main() {
  console.log('🔧 Seeding permissions...');

  // 1) Upsert des nouvelles permissions
  const pCalendarManage = await upsertPermission(
    'calendar.manage',
    'Gérer la configuration du calendrier'
  );

  const pInterventionsSchedule = await upsertPermission(
    'interventions.schedule',
    'Planifier les interventions (assignation / programmation)'
  );

  console.log('✅ Permissions upserted:', {
    calendarManage: pCalendarManage.id,
    interventionsSchedule: pInterventionsSchedule.id,
  });

  // 2) Mapping aux rôles (optionnel) — adapte selon ta politique
  console.log('🔗 Mapping role → permissions...');

  // ADMIN: tout (ici on met view+create+edit+delete+approve)
  await upsertRolePermission(UserRole.ADMIN, pCalendarManage.id, {
    canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true
  });
  await upsertRolePermission(UserRole.ADMIN, pInterventionsSchedule.id, {
    canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true
  });

  // SERVICE_MANAGER: peut planifier les interventions; pas forcément gérer la config calendrier
  await upsertRolePermission(UserRole.SERVICE_MANAGER, pInterventionsSchedule.id, {
    canView: true, canCreate: true, canEdit: true
  });

  // EMPLOYEE: généralement pas de schedule, ni manage calendrier — on ne mappe pas.
  // Si tu veux qu’il voie un écran d’infos sans action, tu peux mettre { canView: true }.

  console.log('🎉 Seed terminé.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
