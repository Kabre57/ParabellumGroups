const { accountTypeFromInput } = require('./accounting');
const { inferSyscohadaAccountType } = require('./syscohadaAccountTypes');

/**
 * Infer a new account's type from an active configured prefix in the current
 * enterprise or the global chart. No accounting-plan rules or cross-company
 * defaults are guessed here, and existing accounts are never modified.
 */
const resolveAccountTypeFromConfiguredParent = async (prisma, code, enterpriseId) => {
  const normalizedCode = String(code || '').trim();
  const scopedEnterpriseId = Number(enterpriseId);
  if (!normalizedCode || !Number.isSafeInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) return null;

  const prefixes = Array.from({ length: normalizedCode.length }, (_, index) => normalizedCode.slice(0, index + 1));
  const accounts = await prisma.accountingAccount.findMany({
    where: {
      isActive: true,
      code: { in: prefixes },
      OR: [{ enterpriseId: scopedEnterpriseId }, { enterpriseId: null }],
    },
    select: { code: true, type: true, enterpriseId: true, isActive: true },
  });

  const candidates = accounts.filter((account) =>
    account.isActive === true &&
    (account.enterpriseId === scopedEnterpriseId || account.enterpriseId === null) &&
    typeof account.code === 'string' && account.code.length > 0 && normalizedCode.startsWith(account.code)
  ).sort((left, right) =>
    right.code.length - left.code.length ||
    Number(right.enterpriseId === scopedEnterpriseId) - Number(left.enterpriseId === scopedEnterpriseId)
  );

  const preferred = candidates[0];
  if (!preferred) return null;
  const equallyPreferred = candidates.filter((account) =>
    account.code === preferred.code && account.enterpriseId === preferred.enterpriseId
  );
  const types = new Set(equallyPreferred.map((account) => accountTypeFromInput(account.type)));
  // Nullable global scopes can contain duplicate codes. Conflicting configured
  // types must not make the result depend on database row order.
  if (types.size !== 1 || types.has(null)) {
    throw Object.assign(new Error('Le type du compte parent configuré est invalide ou contradictoire. Corrigez le plan comptable avant de créer ce compte.'), {
      statusCode: 400,
      code: 'ACCOUNT_TYPE_AMBIGUOUS',
    });
  }
  return [...types][0];
};

const resolveNewAccountType = async (prisma, code, enterpriseId) => {
  const scopedEnterpriseId = Number(enterpriseId);
  if (!Number.isSafeInteger(scopedEnterpriseId) || scopedEnterpriseId <= 0) return null;
  const configuredType = await resolveAccountTypeFromConfiguredParent(prisma, code, scopedEnterpriseId);
  // A conflicting configured parent throws above: it must never be hidden by
  // the reference chart. Only an absent mapping can use the SYSCOHADA rules.
  return configuredType || inferSyscohadaAccountType(code);
};

module.exports = { resolveAccountTypeFromConfiguredParent, resolveNewAccountType };
