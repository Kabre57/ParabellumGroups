const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'pbl_storage_token';
const COOKIE_PATH = '/api/storage';
const STORAGE_ADMIN_PERMISSIONS = new Set(['*', 'enterprises.read_all', 'enterprises.read']);

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: COOKIE_PATH,
  ...(Number.isFinite(maxAge) ? { maxAge } : {}),
});

const setStorageAccessCookie = (res, accessToken) => {
  const payload = jwt.decode(accessToken);
  if (!payload || !Number.isFinite(payload.exp)) {
    throw new Error('Generated access token has no valid expiration');
  }

  const maxAge = Math.max(0, payload.exp * 1000 - Date.now());
  const expiresIn = Math.max(1, Math.floor(maxAge / 1000));
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((permission) => STORAGE_ADMIN_PERMISSIONS.has(permission))
    : [];
  const storageToken = jwt.sign(
    {
      userId: payload.userId,
      role: payload.role || payload.roleCode,
      roleCode: payload.roleCode,
      enterpriseId: payload.enterpriseId,
      permissions,
    },
    process.env.JWT_SECRET,
    {
      expiresIn,
      issuer: payload.iss || 'parabellum-auth-service',
    }
  );

  res.cookie(COOKIE_NAME, storageToken, cookieOptions(maxAge));
};

const clearStorageAccessCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

module.exports = { COOKIE_NAME, setStorageAccessCookie, clearStorageAccessCookie };
