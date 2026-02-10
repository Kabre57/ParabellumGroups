const config = require('../../utils/config');
const { hrServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour hr-service
 */
const rewriteHrPath = (path) => {
  const employeeContractsMatch = path.match(/^\/hr\/employees\/([^\/]+)\/contracts(\?.*)?$/);
  if (employeeContractsMatch) {
    const employeeId = employeeContractsMatch[1];
    const query = employeeContractsMatch[2] || '';
    const queryPrefix = query ? `${query}&` : '?';
    return `/contracts${queryPrefix}employeeId=${encodeURIComponent(employeeId)}`;
  }
  if (path.startsWith('/hr/employees')) {
    return path.replace('/hr/employees', '/api/employes');
  }
  if (path.startsWith('/hr/leave-requests')) {
    return path.replace('/hr/leave-requests', '/api/conges');
  }
  if (path.startsWith('/hr/presences')) {
    return path.replace('/hr/presences', '/api/presences');
  }
  if (path.startsWith('/hr/evaluations')) {
    return path.replace('/hr/evaluations', '/api/evaluations');
  }
  if (path.startsWith('/hr/contracts')) {
    return path.replace('/hr/contracts', '/contracts');
  }
  if (path.startsWith('/hr/payroll')) {
    return path.replace('/hr/payroll', '/payroll');
  }

  return path.replace(/^\/hr/, '/api');
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
    },
  ],
};
