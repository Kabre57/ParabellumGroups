const config = require('../../utils/config');
const { billingServiceLimiter } = require('../../middleware/serviceLimiters');

const billingPermissionRules = [
  {
    pattern: /^\/invoices\/[^/]+\/send$/,
    permissions: {
      POST: ['invoices.send', 'invoices.update']
    }
  },
  {
    pattern: /^\/invoices\/[^/]+\/lignes$/,
    permissions: {
      POST: ['invoices.update', 'invoices.create']
    }
  },
  {
    pattern: /^\/invoices/,
    permissions: {
      GET: 'invoices.read',
      POST: 'invoices.create',
      PUT: 'invoices.update',
      PATCH: 'invoices.update',
      DELETE: 'invoices.delete'
    }
  },
  {
    pattern: /^\/quotes\/[^/]+\/accept$/,
    permissions: {
      POST: 'quotes.approve'
    }
  },
  {
    pattern: /^\/quotes\/[^/]+\/convert-to-facture$/,
    permissions: {
      POST: ['quotes.convert', 'quotes.approve', 'invoices.create']
    }
  },
  {
    pattern: /^\/quotes\/[^/]+\/send$/,
    permissions: {
      POST: ['quotes.update', 'quotes.approve']
    }
  },
  {
    pattern: /^\/quotes\/[^/]+\/lignes$/,
    permissions: {
      POST: ['quotes.update', 'quotes.create']
    }
  },
  {
    pattern: /^\/quotes/,
    permissions: {
      GET: 'quotes.read',
      POST: 'quotes.create',
      PUT: 'quotes.update',
      PATCH: 'quotes.update',
      DELETE: 'quotes.delete'
    }
  },
  {
    pattern: /^\/purchase-commitments/,
    permissions: {
      GET: ['invoices.read', 'purchases.read', 'expenses.read', 'expenses.read_all']
    }
  },
  {
    pattern: /^\/cash-vouchers\/spending-overview$/,
    permissions: {
      GET: ['expenses.read', 'expenses.read_all', 'payments.read']
    }
  },
  {
    pattern: /^\/accounting\/overview$/,
    permissions: {
      GET: ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read']
    }
  },
  {
    pattern: /^\/accounting\/accounts$/,
    permissions: {
      GET: ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read'],
      POST: ['expenses.create', 'expenses.update', 'payments.create']
    }
  },
  {
    pattern: /^\/accounting\/entries$/,
    permissions: {
      GET: ['reports.read_financial', 'expenses.read', 'expenses.read_all', 'payments.read', 'invoices.read'],
      POST: ['expenses.create', 'expenses.update', 'payments.create', 'payments.update']
    }
  },
  {
    pattern: /^\/cash-vouchers\/[^/]+\/status$/,
    permissions: {
      PATCH: ['expenses.approve', 'payments.validate']
    }
  },
  {
    pattern: /^\/cash-vouchers/,
    permissions: {
      GET: ['expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read'],
      POST: 'expenses.create',
      PATCH: ['expenses.update', 'expenses.approve']
    }
  },
  {
    pattern: /^\/payments/,
    permissions: {
      GET: 'payments.read',
      POST: 'payments.create',
      PUT: 'payments.update',
      PATCH: 'payments.update',
      DELETE: 'payments.delete'
    }
  }
];
/**
 * Path rewrite pour billing-service
 */
const rewriteBillingPath = (path) => {
  console.log('[Billing Path Rewrite] Original path:', path);
  
  const normalize = (p) => p.replace(/^\/api\/billing/, '/api').replace(/^\/billing/, '/api');

  if (path.includes('/invoices')) {
    const rewritten = normalize(path).replace('/invoices', '/factures');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (path.includes('/quotes')) {
    const rewritten = normalize(path).replace('/quotes', '/devis');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (path.includes('/payments')) {
    const rewritten = normalize(path).replace('/payments', '/paiements');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  
  const rewritten = normalize(path);
  console.log('[Billing Path Rewrite] Default rewrite to:', rewritten);
  return rewritten;
};

/**
 * Configuration des routes billing-service
 */
module.exports = {
  serviceName: 'BILLING',
  basePath: config.SERVICES.BILLING,
  pathRewrite: rewriteBillingPath,
  limiter: billingServiceLimiter,
  
  routes: [
    {
      path: '/billing',
      auth: true,
      permissionByPath: billingPermissionRules,
    },
  ],
};
