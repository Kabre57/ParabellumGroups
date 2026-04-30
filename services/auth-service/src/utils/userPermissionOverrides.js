const FLAG_FIELDS = ['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'];

const emptyFlags = () => ({
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
});

const normalizeFlags = (input = {}, mapping = {}) => {
  const normalized = emptyFlags();

  for (const field of FLAG_FIELDS) {
    const sourceField = mapping[field] || field;
    normalized[field] = Boolean(input?.[sourceField]);
  }

  return normalized;
};

const hasAnyFlag = (flags = {}) => FLAG_FIELDS.some((field) => Boolean(flags[field]));

const mergeFlags = (roleFlags = {}, userFlags = {}) => {
  const merged = emptyFlags();
  for (const field of FLAG_FIELDS) {
    merged[field] = Boolean(roleFlags[field]) || Boolean(userFlags[field]);
  }
  return merged;
};

const computeMeaningfulOverride = ({ roleFlags = null, userFlags = {} }) => {
  const normalizedUserFlags = normalizeFlags(userFlags);

  if (!roleFlags) {
    return hasAnyFlag(normalizedUserFlags) ? normalizedUserFlags : null;
  }

  const override = emptyFlags();
  for (const field of FLAG_FIELDS) {
    override[field] = Boolean(normalizedUserFlags[field]) && !Boolean(roleFlags[field]);
  }

  return hasAnyFlag(override) ? override : null;
};

module.exports = {
  FLAG_FIELDS,
  emptyFlags,
  normalizeFlags,
  hasAnyFlag,
  mergeFlags,
  computeMeaningfulOverride,
};
