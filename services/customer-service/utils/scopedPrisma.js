const { resolveEnterpriseScope, scopeError, parseEnterpriseId } = require('./enterpriseScope');
const { MODEL_FIELDS } = require('./scopedModels');

const GLOBAL_MODELS = new Set(['typeClient', 'secteurActivite']);
const PARENTS = {
  contact: ['clientId', 'client', 'client'],
  adresseClient: ['clientId', 'client', 'client'],
  contrat: ['clientId', 'client', 'client'],
  interactionClient: ['clientId', 'client', 'client'],
  documentClient: ['clientId', 'client', 'client'],
  opportunite: ['clientId', 'client', 'client'],
  historiqueClient: ['clientId', 'client', 'client'],
  synchronisationProspectClient: ['clientId', 'client', 'client'],
  tacheClient: ['clientId', 'client', 'client'],
  avenantContrat: ['contratId', 'contrat', 'contrat'],
  ligneProduit: ['opportuniteId', 'opportunite', 'opportunite'],
};
const REFERENCES = {
  contrat: { signataireId: 'contact', documentContratId: 'documentClient' },
  documentClient: { contratId: 'contrat' },
  interactionClient: { contactId: 'contact', tacheLieeId: 'tacheClient' },
  tacheClient: { contactId: 'contact', parentTaskId: 'tacheClient' },
};
const JSON_FIELDS = new Set(['preferencesContact', 'modifications', 'ancienneValeur', 'nouvelleValeur', 'differences', 'details']);
const READS = new Set(['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy']);
const MUTATIONS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

const andWhere = (where, scope) => ({
  ...where,
  AND: [...(Array.isArray(where?.AND) ? where.AND : where?.AND ? [where.AND] : []), scope],
});

const modelScope = (model, enterpriseId) => {
  if (GLOBAL_MODELS.has(model)) return null;
  if (model === 'client') return { enterpriseId };
  const parent = PARENTS[model];
  if (!parent) throw scopeError(400, 'Modèle CRM non autorisé.');
  return { [parent[2]]: { is: modelScope(parent[1], enterpriseId) } };
};

// Only known scalar fields reach Prisma. JSON business values are data, never
// relation instructions; nested connect/create/update/delete are not accepted.
const scalarData = (model, input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw scopeError(400, 'Données de modification invalides.');
  }
  const allowed = MODEL_FIELDS[model];
  if (!allowed) throw scopeError(400, 'Modèle CRM non autorisé.');
  const data = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'enterpriseId' && model !== 'client') continue; // request context, not a child field
    if (!allowed.includes(key) || key === 'id') {
      throw scopeError(400, `Champ non modifiable : ${key}.`);
    }
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        !(value instanceof Date) && !JSON_FIELDS.has(key) && typeof value.toFixed !== 'function') {
      throw scopeError(400, `Valeur scalaire requise : ${key}.`);
    }
    data[key] = value;
  }
  return data;
};

const assertParentUnchanged = (data, key, current) => {
  if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined && data[key] !== current[key]) {
    throw scopeError(400, 'Le rattachement de cette ressource ne peut pas être modifié.');
  }
};

// Global classification catalogues remain global, but their client samples,
// filtered counts and predicates must never reveal another company's clients.
const catalogueSelection = (value, enterpriseId) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === 'clients' && item) {
      const args = item === true ? {} : item;
      return [key, { ...args, where: andWhere(args.where, { enterpriseId }) }];
    }
    return [key, catalogueSelection(item, enterpriseId)];
  }));
};

const catalogueWhere = (where, enterpriseId) => {
  if (!where || typeof where !== 'object') return where;
  if (Array.isArray(where)) return where.map((item) => catalogueWhere(item, enterpriseId));
  const result = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === 'clients' && value && typeof value === 'object') {
      result.clients = Object.fromEntries(Object.entries(value).map(([operator, condition]) => [
        operator,
        operator === 'every'
          ? { OR: [{ enterpriseId: { not: enterpriseId } }, condition] }
          : andWhere(condition, { enterpriseId }),
      ]));
    } else result[key] = catalogueWhere(value, enterpriseId);
  }
  return result;
};

const createScopedPrisma = (base, enterpriseId) => {
  parseEnterpriseId(enterpriseId);
  const scopedWhere = (model, where) => {
    const scope = modelScope(model, enterpriseId);
    return scope ? andWhere(where, scope) : catalogueWhere(where, enterpriseId);
  };
  const findOwned = async (model, where) => base[model].findFirst({ where: scopedWhere(model, where) });

  const prepareData = async (model, input, current, creating) => {
    const data = scalarData(model, input);
    if (model === 'client') {
      if (Object.prototype.hasOwnProperty.call(data, 'enterpriseId') &&
          parseEnterpriseId(data.enterpriseId) !== enterpriseId) {
        throw scopeError(403, 'Le client doit appartenir à l’entreprise active.');
      }
      if (creating || Object.prototype.hasOwnProperty.call(data, 'enterpriseId')) data.enterpriseId = enterpriseId;
      return data;
    }
    if (GLOBAL_MODELS.has(model)) return data;
    const [parentKey, parentModel] = PARENTS[model];
    if (current) assertParentUnchanged(data, parentKey, current);
    const parentId = data[parentKey] ?? current?.[parentKey];
    if (typeof parentId !== 'string' || !parentId) throw scopeError(400, 'Rattachement parent requis.');
    const parent = await findOwned(parentModel, { id: parentId });
    if (!parent) throw scopeError(404, 'Ressource parente non trouvée.');
    const clientId = parentModel === 'client' ? parent.id : parent.clientId;
    for (const [key, referenceModel] of Object.entries(REFERENCES[model] || {})) {
      const id = data[key];
      if (id === undefined || id === null || id === '') continue;
      if (typeof id !== 'string' || !await findOwned(referenceModel, { id, clientId })) {
        throw scopeError(404, 'Ressource liée non trouvée pour ce client.');
      }
    }
    return data;
  };

  return new Proxy(base, {
    get(target, model) {
      if (model === 'then') return undefined;
      if (model === '$transaction') return (callback, options) => {
        if (typeof callback !== 'function') throw scopeError(400, 'Transaction CRM non autorisée.');
        return target.$transaction((tx) => callback(createScopedPrisma(tx, enterpriseId)), options);
      };
      if (typeof model !== 'string' || !MODEL_FIELDS[model]) {
        throw scopeError(400, 'Accès CRM non autorisé.');
      }
      const delegate = target[model];
      return new Proxy(delegate, {
        get(modelDelegate, operation) {
          return async (input = {}) => {
            const args = { ...input };
            if (GLOBAL_MODELS.has(model)) {
              if (args.include) args.include = catalogueSelection(args.include, enterpriseId);
              if (args.select) args.select = catalogueSelection(args.select, enterpriseId);
            }
            if (READS.has(operation) || MUTATIONS.has(operation)) args.where = scopedWhere(model, args.where);
            if (READS.has(operation)) {
              const method = operation === 'findUnique' ? 'findFirst' : operation === 'findUniqueOrThrow' ? 'findFirstOrThrow' : operation;
              return modelDelegate[method](args);
            }
            if (operation === 'create' || operation === 'createMany') {
              const rows = Array.isArray(args.data) ? args.data : [args.data];
              const prepared = [];
              for (const row of rows) prepared.push(await prepareData(model, row, null, true));
              args.data = Array.isArray(args.data) ? prepared : prepared[0];
              return modelDelegate[operation](args);
            }
            if (MUTATIONS.has(operation)) {
              if (operation === 'update') {
                const current = await findOwned(model, input.where);
                if (!current) throw scopeError(404, 'Ressource non trouvée.');
                args.data = await prepareData(model, input.data, current, false);
              } else if (operation === 'updateMany') {
                args.data = scalarData(model, input.data);
                // Bulk operations may update fields, never identity or ownership.
                if ('enterpriseId' in args.data || (PARENTS[model] && PARENTS[model][0] in args.data) ||
                    Object.keys(REFERENCES[model] || {}).some((key) => key in args.data)) {
                  throw scopeError(400, 'Rattachement interdit dans une modification groupée.');
                }
              }
              return modelDelegate[operation](args);
            }
            throw scopeError(400, 'Opération CRM non autorisée.');
          };
        },
      });
    },
  });
};

const scopedPrisma = async (req, base) => {
  const { enterpriseId } = await resolveEnterpriseScope(req);
  return createScopedPrisma(base, enterpriseId);
};

module.exports = { scopedPrisma, createScopedPrisma, scalarData, assertParentUnchanged, modelScope, andWhere };
