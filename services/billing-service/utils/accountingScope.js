const normalizeEnterpriseId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
};

/**
 * Un compte comptable global peut être associé à une famille propre à une
 * entreprise. Un compte appartenant à une entreprise reste limité à cette
 * entreprise et ne peut pas être rattaché à une famille globale.
 */
const isAccountAllowedForFamilyScope = (accountEnterpriseId, familyEnterpriseId) => {
  const accountScope = normalizeEnterpriseId(accountEnterpriseId);
  const familyScope = normalizeEnterpriseId(familyEnterpriseId);

  if (Number.isNaN(accountScope) || Number.isNaN(familyScope)) return false;
  if (familyScope === null) return accountScope === null;
  return accountScope === null || accountScope === familyScope;
};

module.exports = { isAccountAllowedForFamilyScope };
