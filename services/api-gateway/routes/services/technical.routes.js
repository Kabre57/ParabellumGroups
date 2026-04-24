const config = require('../../utils/config');
const { technicalServiceLimiter } = require('../../middleware/serviceLimiters');

const technicalPermissionRules = [
  {
    pattern: /^\/interventions/,
    permissions: {
      GET: ['interventions.read', 'interventions.read_all', 'interventions.read_assigned', 'interventions.create_report'],
      POST: 'interventions.create',
      PUT: ['interventions.update', 'interventions.create_report'],
      PATCH: ['interventions.update', 'interventions.create_report'],
      DELETE: 'interventions.delete'
    }
  },
  {
    pattern: /^\/missions/,
    permissions: {
      GET: ['missions.read', 'missions.read_all', 'missions.read_assigned', 'interventions.create_report'],
      POST: 'missions.create',
      PUT: 'missions.update',
      PATCH: 'missions.update',
      DELETE: 'missions.delete'
    }
  },
  {
    pattern: /^\/techniciens/,
    permissions: {
      GET: 'techniciens.read',
      POST: 'techniciens.create',
      PUT: 'techniciens.update',
      PATCH: 'techniciens.update',
      DELETE: 'techniciens.delete'
    }
  },
  {
    pattern: /^\/specialites/,
    permissions: {
      GET: 'specialites.read',
      POST: 'specialites.create',
      PUT: 'specialites.update',
      PATCH: 'specialites.update',
      DELETE: 'specialites.delete'
    }
  },
  {
    pattern: /^\/materiel/,
    permissions: {
      GET: 'materiel.read',
      POST: 'materiel.create',
      PUT: 'materiel.update',
      PATCH: 'materiel.update',
      DELETE: 'materiel.delete'
    }
  },
  {
    pattern: /^\/rapports/,
    permissions: {
      GET: ['rapports_techniques.read', 'rapports_techniques.read_own', 'interventions.create_report'],
      POST: ['rapports_techniques.create', 'interventions.create_report'],
      PUT: ['rapports_techniques.update', 'interventions.create_report'],
      PATCH: ['rapports_techniques.update', 'rapports_techniques.validate'],
      DELETE: ['rapports_techniques.delete']
    }
  },
  {
    pattern: /^\/ordres-mission/,
    permissions: {
      GET: ['mission_orders.read', 'missions.read'],
      POST: ['mission_orders.create', 'missions.read'],
      PATCH: ['mission_orders.update', 'missions.update'],
      DELETE: ['mission_orders.delete', 'missions.delete']
    }
  }
];

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
      permissionByPath: technicalPermissionRules,
    },
    // Routes directes pour compatibilité frontend
    {
      path: '/techniciens',
      auth: true,
      permission: {
        GET: 'techniciens.read',
        POST: 'techniciens.create',
        PUT: 'techniciens.update',
        PATCH: 'techniciens.update',
        DELETE: 'techniciens.delete'
      },
      pathRewrite: { '^/techniciens': '/api/techniciens' },
    },
    {
      path: '/missions',
      auth: true,
      permission: {
        GET: ['missions.read', 'missions.read_all', 'missions.read_assigned', 'interventions.create_report'],
        POST: 'missions.create',
        PUT: 'missions.update',
        PATCH: 'missions.update',
        DELETE: 'missions.delete'
      },
      pathRewrite: { '^/missions': '/api/missions' },
    },
    {
      path: '/interventions',
      auth: true,
      permission: {
        GET: ['interventions.read', 'interventions.read_all', 'interventions.read_assigned', 'interventions.create_report'],
        POST: 'interventions.create',
        PUT: ['interventions.update', 'interventions.create_report'],
        PATCH: ['interventions.update', 'interventions.create_report'],
        DELETE: 'interventions.delete'
      },
      pathRewrite: { '^/interventions': '/api/interventions' },
    },
    {
      path: '/rapports',
      auth: true,
      permission: {
        GET: ['rapports_techniques.read', 'rapports_techniques.read_own', 'interventions.create_report'],
        POST: ['rapports_techniques.create', 'interventions.create_report'],
        PUT: ['rapports_techniques.update', 'interventions.create_report'],
        PATCH: ['rapports_techniques.update', 'rapports_techniques.validate'],
        DELETE: ['rapports_techniques.delete']
      },
      pathRewrite: { '^/rapports': '/api/rapports' },
    },
    {
      path: '/specialites',
      auth: true,
      permission: {
        GET: 'specialites.read',
        POST: 'specialites.create',
        PUT: 'specialites.update',
        PATCH: 'specialites.update',
        DELETE: 'specialites.delete'
      },
      pathRewrite: { '^/specialites': '/api/specialites' },
    },
    {
      path: '/materiel',
      auth: true,
      permission: {
        GET: 'materiel.read',
        POST: 'materiel.create',
        PUT: 'materiel.update',
        PATCH: 'materiel.update',
        DELETE: 'materiel.delete'
      },
      pathRewrite: { '^/materiel': '/api/materiel' },
    },
    {
      path: '/ordres-mission',
      auth: true,
      permission: {
        GET: ['mission_orders.read', 'missions.read'],
        POST: ['mission_orders.create', 'missions.read'],
        PATCH: ['mission_orders.update', 'missions.update'],
        DELETE: ['mission_orders.delete', 'missions.delete']
      },
      pathRewrite: { '^/ordres-mission': '/api/ordres-mission' },
    },
  ],
};
