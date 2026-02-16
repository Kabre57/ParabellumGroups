const config = require('../../utils/config');
const { analyticsServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour analytics-service
 */
const rewriteAnalyticsPath = (path) => {
  if (path.includes('/analytics/rapports')) {
    return path.replace(/.*\/analytics\/rapports/, '/api/rapports');
  }
  if (path.includes('/analytics/kpis')) {
    return path.replace(/.*\/analytics\/kpis/, '/api/kpis');
  }
  if (path.includes('/analytics/dashboards')) {
    return path.replace(/.*\/analytics\/dashboards/, '/api/dashboards');
  }
  if (path.includes('/analytics/widgets')) {
    return path.replace(/.*\/analytics\/widgets/, '/api/widgets');
  }
  if (path.includes('/analytics/overview')) {
    return path.replace(/.*\/analytics\/overview/, '/api/analytics/overview');
  }
  return path.replace(/.*\/analytics/, '/api/analytics');
};

/**
 * Configuration des routes analytics-service
 */
module.exports = {
  serviceName: 'ANALYTICS',
  basePath: config.SERVICES.ANALYTICS,
  pathRewrite: rewriteAnalyticsPath,
  limiter: analyticsServiceLimiter,
  
  routes: [
    {
      path: '/analytics',
      auth: true,
      permission: { GET: 'reports.financial' },
    },
  ],
};
