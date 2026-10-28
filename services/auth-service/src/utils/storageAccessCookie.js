const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'pbl_storage_token';
const COOKIE_PATH = '/api/storage';

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
  res.cookie(COOKIE_NAME, accessToken, cookieOptions(maxAge));
};

const clearStorageAccessCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

module.exports = { COOKIE_NAME, setStorageAccessCookie, clearStorageAccessCookie };
