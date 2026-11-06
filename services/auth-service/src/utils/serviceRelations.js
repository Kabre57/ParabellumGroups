const syncServiceHierarchy = async (client, serviceId, parentId) => {
  await client.serviceHierarchy.upsert({
    where: { serviceId: Number(serviceId) },
    create: {
      serviceId: Number(serviceId),
      parentId: parentId == null ? null : Number(parentId),
      level: 1,
    },
    update: { parentId: parentId == null ? null : Number(parentId) },
  });

  const rows = await client.serviceHierarchy.findMany({
    select: { serviceId: true, parentId: true },
  });
  const parentByService = new Map(rows.map((row) => [row.serviceId, row.parentId]));
  const levelByService = new Map();

  const resolveLevel = (id, path = new Set()) => {
    if (levelByService.has(id)) return levelByService.get(id);
    if (path.has(id)) throw new Error('A service hierarchy cycle was detected.');
    path.add(id);
    const parent = parentByService.get(id);
    const level = parent == null ? 1 : resolveLevel(parent, path) + 1;
    path.delete(id);
    levelByService.set(id, level);
    return level;
  };

  await Promise.all(rows.map((row) =>
    client.serviceHierarchy.update({
      where: { serviceId: row.serviceId },
      data: { level: resolveLevel(row.serviceId) },
    })
  ));
};

const syncServiceManager = async (client, serviceId, managerId) => {
  const normalizedServiceId = Number(serviceId);
  const normalizedManagerId = managerId == null ? null : Number(managerId);
  const now = new Date();
  const currentPrimary = await client.serviceManager.findFirst({
    where: { serviceId: normalizedServiceId, isPrimary: true, endDate: null },
    select: { managerId: true },
  });

  if (currentPrimary?.managerId === normalizedManagerId) return;

  await client.serviceManager.updateMany({
    where: { serviceId: normalizedServiceId, isPrimary: true, endDate: null },
    data: { isPrimary: false, endDate: now },
  });

  if (normalizedManagerId == null) return;

  const existingAssignment = await client.serviceManager.findFirst({
    where: { serviceId: normalizedServiceId, managerId: normalizedManagerId, endDate: null },
    select: { id: true },
  });

  if (existingAssignment) {
    await client.serviceManager.update({
      where: { id: existingAssignment.id },
      data: { role: 'Responsable principal', isPrimary: true },
    });
  } else {
    await client.serviceManager.create({
      data: {
        serviceId: normalizedServiceId,
        managerId: normalizedManagerId,
        role: 'Responsable principal',
        isPrimary: true,
        startDate: now,
      },
    });
  }
};

const syncServiceMember = async (client, userId, serviceId, { isActive = true, position = null } = {}) => {
  if (client.__isSqlFallback) return;

  const normalizedUserId = Number(userId);
  const normalizedServiceId = serviceId == null || serviceId === '' ? null : Number(serviceId);
  const now = new Date();

  await client.serviceMember.updateMany({
    where: {
      userId: normalizedUserId,
      endDate: null,
      ...(normalizedServiceId == null ? {} : { serviceId: { not: normalizedServiceId } }),
    },
    data: { endDate: now, isActive: false },
  });

  if (normalizedServiceId == null) return;

  const currentMembership = await client.serviceMember.findFirst({
    where: { userId: normalizedUserId, serviceId: normalizedServiceId, endDate: null },
    select: { id: true },
  });

  if (currentMembership) {
    await client.serviceMember.update({
      where: { id: currentMembership.id },
      data: { isActive: Boolean(isActive), position: position || null },
    });
    return;
  }

  await client.serviceMember.create({
    data: {
      userId: normalizedUserId,
      serviceId: normalizedServiceId,
      isActive: Boolean(isActive),
      position: position || null,
    },
  });
};

const syncServiceMemberStatus = async (client, userId, isActive) => {
  if (client.__isSqlFallback) return;

  await client.serviceMember.updateMany({
    where: { userId: Number(userId), endDate: null },
    data: { isActive: Boolean(isActive) },
  });
};

const recordServiceHistory = async (client, { serviceId, userId, action, description, oldData, newData }) =>
  client.serviceHistory.create({
    data: {
      serviceId: Number(serviceId),
      userId: userId == null ? null : Number(userId),
      action,
      description: description || null,
      oldData: oldData === undefined ? undefined : oldData,
      newData: newData === undefined ? undefined : newData,
    },
  });

module.exports = {
  syncServiceHierarchy,
  syncServiceManager,
  syncServiceMember,
  syncServiceMemberStatus,
  recordServiceHistory,
};
