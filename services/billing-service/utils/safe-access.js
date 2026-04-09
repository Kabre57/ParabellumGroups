/**
 * Sécurise la conversion d'une valeur en nombre financier
 */
const safeAmount = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Sécurise la conversion d'une date
 */
const safeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Accès sécurisé à un chemin d'objet profondément imbriqué
 */
const safeAccess = (obj, path, defaultValue = null) => {
  if (!obj) return defaultValue;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return defaultValue;
    return acc[key];
  }, obj);
};

module.exports = {
  safeAmount,
  safeDate,
  safeAccess
};
