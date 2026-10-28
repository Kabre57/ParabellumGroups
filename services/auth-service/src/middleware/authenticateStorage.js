const authenticate = require('./auth');

const getCookieToken = (cookieHeader, name) => {
  const entry = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
};

module.exports = (req, res, next) => {
  if (!req.headers.authorization) {
    const token = getCookieToken(req.headers.cookie, 'pbl_storage_token');
    if (token) req.headers.authorization = `Bearer ${token}`;
  }
  return authenticate(req, res, next);
};
