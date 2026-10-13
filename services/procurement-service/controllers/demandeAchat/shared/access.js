// Regles d autorisation pour les demandes, devis et proformas.
const isAdminUser = (user) => {
  const role = String(user?.role || user?.roleCode || '').toUpperCase();
  return ['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR'].includes(role);
};

const normalizePermissions = (permissions = []) =>
  (Array.isArray(permissions) ? permissions : [permissions])
    .map((permission) => String(permission || '').trim().toLowerCase())
    .filter(Boolean);

const hasPermission = (user, ...permissions) => {
  const permissionSet = new Set(normalizePermissions(user?.permissions));
  return permissions.some((permission) => permissionSet.has(String(permission).toLowerCase()));
};

const canReadAllQuotes = (user) =>
  isAdminUser(user) ||
  hasPermission(
    user,
    'quotes.read_all',
    'purchases.read_all',
    'purchase_requests.read_all',
    'purchase_orders.create',
    'purchase_orders.update',
    'purchase_requests.approve'
  );

const canReadOwnQuotesOnly = (user) => {
  if (canReadAllQuotes(user)) {
    return false;
  }

  return hasPermission(
    user,
    'purchases.read',
    'purchases.create',
    'purchases.update',
    'quotes.read_own',
    'purchases.read_own',
    'purchase_requests.read',
    'purchase_requests.read_own',
    'purchase_requests.create',
    'purchase_requests.update'
  );
};

const canCreateRequests = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchases.create', 'purchase_requests.create');

const canUpdateRequests = (user) =>
  isAdminUser(user) ||
  hasPermission(user, 'purchases.update', 'purchase_requests.update', 'purchases.create', 'purchase_requests.create');

const canSubmitQuotes = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchases.submit') || canUpdateRequests(user);

const canApproveQuotes = (user) => isAdminUser(user) || hasPermission(user, 'purchase_requests.approve');
const canRejectQuotes = (user) => canApproveQuotes(user);

const canManageProformas = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_orders.create', 'purchase_orders.update');

const canEvaluateCommittee = (user) =>
  isAdminUser(user) || hasPermission(user, 'purchase_requests.evaluate_committee', 'purchase_requests.approve');

module.exports = {
  isAdminUser, normalizePermissions, hasPermission, canReadAllQuotes, canReadOwnQuotesOnly,
  canCreateRequests, canUpdateRequests, canSubmitQuotes, canApproveQuotes, canRejectQuotes,
  canManageProformas, canEvaluateCommittee,
};
