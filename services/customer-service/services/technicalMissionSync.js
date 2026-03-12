const TECHNICAL_SERVICE_URL = process.env.TECHNICAL_SERVICE_URL || 'http://technical-service:4003';

const syncMissionsFromClientAddress = async (reqOrUser, clientId, options = {}) => {
  if (!clientId) {
    return;
  }

  const userId = reqOrUser?.user?.id || reqOrUser?.id || '1';
  const userRole = reqOrUser?.user?.role || reqOrUser?.role || 'admin';

  try {
    await fetch(`${TECHNICAL_SERVICE_URL}/api/missions/resync-crm/by-client/${clientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
        'x-user-role': String(userRole),
      },
      body: JSON.stringify(options),
    });
  } catch (error) {
    console.error('Impossible de resynchroniser les missions depuis le CRM:', error);
  }
};

module.exports = {
  syncMissionsFromClientAddress,
};
