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
      GET: 'payroll.read',
      POST: 'payroll.create',
      PUT: 'payroll.update',
      PATCH: 'payroll.update',
      DELETE: 'payroll.delete'
    }
  },
  {
    pattern: /^\/loans/,
    permissions: {
      GET: 'loans.read',
      POST: 'loans.create',
      PUT: 'loans.update',
      PATCH: 'loans.update',
      DELETE: 'loans.delete'
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
    const rewritten = `/api/contrats${queryPrefix}employeeId=${encodeURIComponent(employeeId)}`;
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  const bareEmployeeContractsMatch = normalizedPath.match(/^\/employees\/([^\/]+)\/contracts(\?.*)?$/);
  if (bareEmployeeContractsMatch) {
    const employeeId = bareEmployeeContractsMatch[1];
    const query = bareEmployeeContractsMatch[2] || '';
    const queryPrefix = query ? `${query}&` : '?';
    const rewritten = `/api/contrats${queryPrefix}employeeId=${encodeURIComponent(employeeId)}`;
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
    const rewritten = normalizedPath.replace('/hr/contracts', '/api/contrats');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/payroll')) {
    const rewritten = normalizedPath.replace('/hr/payroll', '/api/paie');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/hr/loans')) {
    const rewritten = normalizedPath.replace('/hr/loans', '/api/prets');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payrolls')) {
    const rewritten = normalizedPath.replace('/payrolls', '/api/paie/bulletins');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/api/payrolls')) {
    const rewritten = normalizedPath.replace('/api/payrolls', '/api/paie/bulletins');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll/overview')) {
    const rewritten = normalizedPath.replace('/payroll/overview', '/api/paie/overview');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll/calculate')) {
    const rewritten = normalizedPath.replace('/payroll/calculate', '/api/paie/bulletins/calculer');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll/generate-all')) {
    const rewritten = normalizedPath.replace('/payroll/generate-all', '/api/paie/traitement-masse');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll/generate')) {
    const rewritten = normalizedPath.replace('/payroll/generate', '/api/paie/bulletins/calculer');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll/exports')) {
    const rewritten = normalizedPath.replace('/payroll/exports', '/api/exports');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/payroll')) {
    const rewritten = normalizedPath.replace('/payroll', '/api/paie');
    console.log('[HR Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }
  if (normalizedPath.startsWith('/api/payroll')) {
    const rewritten = normalizedPath.replace('/api/payroll', '/api/paie');
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
      path: '/payroll',
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
