const prisma = require('../config/database');

const SERVICE_MANAGER_ROLE = 'SERVICE_MANAGER';
const PRIVILEGED_TARGET_ROLES = new Set([
  'ADMIN',
  'ADMINISTRATOR',
  'ADMINISTRATEUR',
  'SUPER_ADMIN',
  'SUPERADMIN',
  'GENERAL_DIRECTOR',
  'GERANT',
  SERVICE_MANAGER_ROLE,
]);

const getRoleCode = (user) => {
  const role = user?.role;
  if (typeof role === 'string') return role.toUpperCase();
  return String(role?.code || user?.roleCode || '').toUpperCase();
};

const isServiceManager = (user) => getRoleCode(user) === SERVICE_MANAGER_ROLE;
const isPrivilegedTarget = (user) => PRIVILEGED_TARGET_ROLES.has(getRoleCode(user));

const getManagedServices = async (user, client = prisma) => {
  if (!isServiceManager(user)) return [];

  const assignments = await client.serviceManager.findMany({
    where: {
      managerId: Number(user.id),
      isPrimary: true,
      endDate: null,
      service: { isActive: true },
    },
    select: { service: { select: { id: true, name: true } } },
  });

  return assignments
    .map(({ service }) => service)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const getManagedServiceIds = async (user, client = prisma) =>
  (await getManagedServices(user, client)).map((service) => service.id);

const findManagedUser = async (user, userId, client = prisma) => {
  if (!isServiceManager(user)) return null;
  if (Number(userId) === Number(user.id)) return null;
  const serviceIds = await getManagedServiceIds(user, client);
  if (!serviceIds.length) return null;

  return client.user.findFirst({
    where: {
      id: Number(userId),
      serviceId: { in: serviceIds },
      ...(user.enterpriseId != null ? { enterpriseId: Number(user.enterpriseId) } : {}),
    },
    include: { role: true },
  });
};

const ensureManagedTarget = async (user, userId, client = prisma) => {
  const target = await findManagedUser(user, userId, client);
  if (!target || isPrivilegedTarget(target)) return null;
  return target;
};

module.exports = {
  SERVICE_MANAGER_ROLE,
  getRoleCode,
  isServiceManager,
  isPrivilegedTarget,
  getManagedServices,
  getManagedServiceIds,
  findManagedUser,
  ensureManagedTarget,
};
