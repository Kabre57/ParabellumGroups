const config = require('../../utils/config');
const { billingServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour billing-service
 */
const rewriteBillingPath = (path) => {
  console.log('[Billing Path Rewrite] Original path:', path);
  
  if (path.includes('/invoices')) {
    const rewritten = path.replace(/\/invoices/, '/factures');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (path.includes('/quotes')) {
    const rewritten = path.replace(/\/quotes/, '/devis');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (path.includes('/payments')) {
    const rewritten = path.replace(/\/payments/, '/paiements');
    console.log('[Billing Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  
  const rewritten = path.replace(/^\/billing/, '/api');
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
    },
  ],
};
