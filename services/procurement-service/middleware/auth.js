const parseIntHeader = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePermissionsHeader = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => parsePermissionsHeader(item));
  }

  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({
      error: 'Non autorise - Header X-User-Id requis',
    });
  }

  req.userId = String(userId);
  req.user = {
    id: String(userId),
    email: req.headers['x-user-email'] ? String(req.headers['x-user-email']) : null,
    role: req.headers['x-user-role'] ? String(req.headers['x-user-role']) : null,
    serviceId: parseIntHeader(req.headers['x-service-id']),
    serviceName: req.headers['x-service-name'] ? String(req.headers['x-service-name']) : null,
    permissions: parsePermissionsHeader(req.headers['x-user-permissions']),
  };

  next();
};

module.exports = authMiddleware;
