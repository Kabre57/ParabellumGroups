const config = require('../../utils/config');
const { procurementServiceLimiter } = require('../../middleware/serviceLimiters');

const procurementPermissionRules = [
  {
    pattern: /^\/devis-achat\/[^/]+\/proformas\/[^/]+\/committee-evaluation$/,
    permissions: {
      POST: ['purchase_requests.evaluate_committee', 'purchase_requests.approve'],
    },
  },
  {
    pattern: /^\/devis-achat\/[^/]+\/proformas\/[^/]+\/recommend$/,
    permissions: {
      POST: ['purchase_requests.evaluate_committee', 'purchase_requests.approve', 'purchase_orders.create'],
    },
  },
  {
    pattern: /^\/devis-achat\/[^/]+\/approve$/,
    permissions: {
      POST: ['purchase_requests.approve'],
      PATCH: ['purchase_requests.approve'],
    },
  },
  {
    pattern: /^\/devis-achat\/[^/]+\/reject$/,
    permissions: {
      POST: ['purchase_requests.approve'],
      PATCH: ['purchase_requests.approve'],
    },
  },
  {
    pattern: /^\/devis-achat\/[^/]+\/generate-order$/,
    permissions: {
      POST: ['purchase_orders.create'],
    },
  },
  {
    pattern: /^\/devis-achat\/[^/]+\/submit$/,
    permissions: {
      POST: 'purchases.submit',
    },
  },
  {
    pattern: /^\/devis-achat/,
    permissions: {
      GET: [
        'purchases.read',
        'purchases.read_own',
        'purchases.read_all',
        'purchase_requests.read',
        'purchase_requests.read_own',
        'purchase_requests.read_all',
        'purchase_requests.read_committee',
        'purchase_requests.evaluate_committee',
        'purchase_requests.approve',
        'quotes.read',
        'quotes.read_own',
        'quotes.read_all',
      ],
      POST: 'purchases.create',
      PUT: 'purchases.update',
      PATCH: 'purchases.update',
      DELETE: 'purchases.delete',
    },
  },
  {
    pattern: /^\/demandes-achat\/[^/]+\/approve$/,
    permissions: {
      POST: ['purchase_requests.approve'],
      PATCH: ['purchase_requests.approve'],
    },
  },
  {
    pattern: /^\/demandes-achat\/[^/]+\/reject$/,
    permissions: {
      POST: ['purchase_requests.approve'],
      PATCH: ['purchase_requests.approve'],
    },
  },
  {
    pattern: /^\/demandes-achat/,
    permissions: {
      GET: [
        'purchases.read',
        'purchases.read_own',
        'purchases.read_all',
        'purchase_requests.read',
        'purchase_requests.read_own',
        'purchase_requests.read_all',
        'purchase_requests.read_committee',
        'purchase_requests.evaluate_committee',
        'purchase_requests.approve',
        'quotes.read',
        'quotes.read_own',
        'quotes.read_all',
      ],
      POST: 'purchases.create',
      PUT: 'purchases.update',
      PATCH: 'purchases.update',
      DELETE: 'purchases.delete',
    },
  },
  {
    pattern: /^\/bons-commande\/[^/]+\/status$/,
    permissions: {
      PATCH: ['purchase_orders.update', 'purchase_orders.approve', 'purchase_orders.receive'],
    },
  },
  {
    pattern: /^\/bons-commande/,
    permissions: {
      GET: 'purchase_orders.read',
      POST: 'purchase_orders.create',
      PUT: 'purchase_orders.update',
      PATCH: 'purchase_orders.update',
      DELETE: 'purchase_orders.delete',
    },
  },
  {
    pattern: /^\/fournisseurs/,
    permissions: {
      GET: 'suppliers.read',
      POST: 'suppliers.create',
      PUT: 'suppliers.update',
      PATCH: 'suppliers.update',
      DELETE: 'suppliers.delete',
    },
  },
];

const rewriteProcurementPath = (path) => {
  if (path.startsWith('/procurement/fournisseurs')) {
    return path.replace('/procurement/fournisseurs', '/api/fournisseurs');
  }
  if (path.startsWith('/procurement/bons-commande')) {
    return path.replace('/procurement/bons-commande', '/api/bons-commande');
  }
  if (path.startsWith('/procurement/devis-achat')) {
    return path.replace('/procurement/devis-achat', '/api/devis-achat');
  }
  if (path.startsWith('/procurement/demandes-achat')) {
    return path.replace('/procurement/demandes-achat', '/api/demandes-achat');
  }
  if (path.startsWith('/procurement/orders')) {
    return path.replace('/procurement/orders', '/api/bons-commande');
  }
  if (path.startsWith('/procurement/requests')) {
    return path.replace('/procurement/requests', '/api/devis-achat');
  }
  if (path.startsWith('/procurement/suppliers')) {
    return path.replace('/procurement/suppliers', '/api/fournisseurs');
  }
  return path.replace(/^\/procurement/, '/api');
};

module.exports = {
  serviceName: 'PROCUREMENT',
  basePath: config.SERVICES.PROCUREMENT,
  pathRewrite: rewriteProcurementPath,
  limiter: procurementServiceLimiter,

  routes: [
    {
      path: '/procurement',
      auth: true,
      permissionByPath: procurementPermissionRules,
    },
  ],
};
