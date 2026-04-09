/**
 * Utilitaires d'accès sécurisé pour éviter les erreurs 500 sur données null/undefined
 */

const safeAccess = (obj, path, fallback = null) => {
  const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
  return value !== undefined && value !== null ? value : fallback;
};

const safeAmount = (value, fallback = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
};

const safeDate = (value, fallback = null) => {
  if (!value) return fallback;
  const date = new Date(value);
  return isNaN(date.getTime()) ? fallback : date;
};

module.exports = {
  safeAccess,
  safeAmount,
  safeDate
};
