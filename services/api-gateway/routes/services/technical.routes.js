const config = require('../../utils/config');
  const { technicalServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour technical-service
 */
const rewriteTechnicalPath = (path) => {
  const [pathname, query] = path.split('?');
  let normalized = pathname;

  if (normalized.startsWith('/api/')) {
    normalized = normalized.slice(4);
  }

  if (normalized.startsWith('/technical')) {
    normalized = normalized.slice('/technical'.length);
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized === '/') {
    normalized = '';
  }

  const rewritten = `/api${normalized}`;
  return query ? `${rewritten}?${query}` : rewritten;
};

/**
 * Configuration des routes technical-service
 */
module.exports = {
  serviceName: 'TECHNICAL',
  basePath: config.SERVICES.TECHNICAL,
  pathRewrite: rewriteTechnicalPath,
  limiter: technicalServiceLimiter,
  
  routes: [
    {
      path: '/technical',
      auth: true,
    },
    // Routes directes pour compatibilité frontend
    {
      path: '/techniciens',
      auth: true,
      pathRewrite: { '^/techniciens': '/api/techniciens' },
    },
    {
      path: '/missions',
      auth: true,
      pathRewrite: { '^/missions': '/api/missions' },
    },
    {
      path: '/interventions',
      auth: true,
      pathRewrite: { '^/interventions': '/api/interventions' },
    },
    {
      path: '/rapports',
      auth: true,
      pathRewrite: { '^/rapports': '/api/rapports' },
    },
    {
      path: '/specialites',
      auth: true,
      pathRewrite: { '^/specialites': '/api/specialites' },
    },
    {
      path: '/materiel',
      auth: true,
      pathRewrite: { '^/materiel': '/api/materiel' },
    },
  ],
};
