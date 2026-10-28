// Validation du compte de contrepartie choisi sur un bon de caisse.
// Décaissement : contrepartie = compte DÉBITÉ (charge, avance personnel, fournisseur...).
// Encaissement : contrepartie = compte CRÉDITÉ.
// Le compte de trésorerie (classe 5) reste porté par treasuryAccountId.

const counterpartError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const resolveCounterpartAccountId = async (db, { counterpartAccountId, enterpriseId }) => {
  const id = String(counterpartAccountId || '').trim();
  if (!id) return null;

  const account = await db.accountingAccount.findUnique({
    where: { id },
    select: { id: true, code: true, isActive: true, allowManualPosting: true, enterpriseId: true },
  });

  if (!account || account.isActive === false) {
    throw counterpartError('Le compte de contrepartie est introuvable ou inactif.');
  }
  if (account.enterpriseId !== enterpriseId) {
    throw counterpartError('Le compte de contrepartie doit appartenir à l’entreprise du bon de caisse.', 403);
  }
  if (String(account.code).startsWith('5')) {
    throw counterpartError('Un compte de trésorerie (classe 5) ne peut pas servir de contrepartie : utilisez un virement interne.');
  }
  if (account.allowManualPosting === false) {
    throw counterpartError('Ce compte n’autorise pas l’imputation directe. Choisissez un sous-compte.');
  }
  return account.id;
};

module.exports = { resolveCounterpartAccountId };
