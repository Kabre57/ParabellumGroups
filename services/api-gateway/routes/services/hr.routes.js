const config = require('../../utils/config');
const { hrServiceLimiter } = require('../../middleware/serviceLimiters');

const hrPermissionRules = [
  {
    pattern: /^\/employees/,
    permissions: {
      GET: 'employees.read',
      POST: 'employees.create',
      PUT: 'employees.update',
      PATCH: 'employees.update',
      DELETE: 'employees.delete'
    }
  },
  {
    pattern: /^\/contracts/,
    permissions: {
      GET: 'contracts.read',
      POST: 'contracts.create',
      PUT: 'contracts.update',
      PATCH: 'contracts.update',
      DELETE: 'contracts.delete'
    }
  },
  {
    pattern: /^\/leave-requests/,
    permissions: {
      GET: 'leaves.read',
      POST: 'leaves.create',
      PUT: 'leaves.update',
      PATCH: 'leaves.update',
      DELETE: 'leaves.delete'
    }
  },
  {
    pattern: /^\/payroll/,
    permissions: {
      GET: 'salaries.read',
      POST: 'salaries.create',
      PUT: 'salaries.update',
      PATCH: 'salaries.update',
      DELETE: 'salaries.delete'
    }
  }
];
/**
 * Path rewrite pour hr-service
 */
const rewriteHrPath = (path) => {
  console.log('[HR Path Rewrite] Original path:', path);

  // Normaliser le préfixe (/api/hr -> /hr) pour simplifier les remplacements
  const normalizedPath = path.replace(/^\/api\/hr/, '/hr');

  const employeeContractsMatch = normalizedPath.match(/^\/hr\/employees\/([^\/]+)\/contracts(\?.*)?$/);
  if (employeeContractsMatch) {
    const employeeId = employeeContractsMatch[1];
    const query = employeeContractsMatch[2] || '';
    const queryPrefix = query ? `${query}&` : '?';
    const rewritten = `/contracts${queryPrefix}employeeId=${encodeURIComponent(employeeId)}`;
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/employees')) {
    const rewritten = normalizedPath.replace('/hr/employees', '/api/employes');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/leave-requests')) {
    const rewritten = normalizedPath.replace('/hr/leave-requests', '/api/conges');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/presences')) {
    const rewritten = normalizedPath.replace('/hr/presences', '/api/presences');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/evaluations')) {
    const rewritten = normalizedPath.replace('/hr/evaluations', '/api/evaluations');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/contracts')) {
    const rewritten = normalizedPath.replace('/hr/contracts', '/contracts');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/payroll')) {
    const rewritten = normalizedPath.replace('/hr/payroll', '/payroll');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payrolls')) {
    const rewritten = normalizedPath.replace('/payrolls', '/payroll');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/api/payrolls')) {
    const rewritten = normalizedPath.replace('/api/payrolls', '/payroll');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/api/employees')) {
    const rewritten = normalizedPath.replace('/api/employees', '/api/employes');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/employees')) {
    const rewritten = normalizedPath.replace('/employees', '/api/employes');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }

  const rewritten = normalizedPath.replace(/^\/hr/, '/api');
  console.log('[HR Path Rewrite] Rewritten to:', rewritten);
  return rewritten;
};

/**
 * Configuration des routes hr-service
 */
module.exports = {
  serviceName: 'HR',
  basePath: config.SERVICES.HR,
  pathRewrite: rewriteHrPath,
  limiter: hrServiceLimiter,
  
  routes: [
    {
      path: '/hr',
      auth: true,
      permissionByPath: hrPermissionRules,
    },
    {
      path: '/employees',
      auth: true,
      permissionByPath: hrPermissionRules,
      pathRewrite: rewriteHrPath,
    },
    {
      path: '/payrolls',
      auth: true,
      permissionByPath: hrPermissionRules,
      pathRewrite: rewriteHrPath,
    },
    {
      path: '/timesheets',
      auth: true,
      // Pas de permissions fines pour l'instant, on redirige vers le stub HR
      pathRewrite: (path) => {
        console.log('[HR Path Rewrite] Timesheets original path:', path);
        const rewritten = path.replace(/^\/timesheets/, '/api/timesheets');
        console.log('[HR Path Rewrite] Timesheets rewritten to:', rewritten);
        return rewritten;
      }
    }
  ],
};
