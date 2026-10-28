const config = require('../../utils/config');
const { procurementServiceLimiter } = require('../../middleware/serviceLimiters');

const rewritePath = (path) => path.replace(/^\/api(?=\/|$)/, '').replace(/^\/operational-requests/, '/api/operational-requests');

const operationalRequestPermissionRules = [
  { pattern: /^\/operational-requests\/[^/]+\/approve$/, permissions: { POST: 'operational_requests.approve' } },
  { pattern: /^\/operational-requests\/[^/]+\/reject$/, permissions: { POST: 'operational_requests.reject' } },
  { pattern: /^\/operational-requests\/[^/]+\/return$/, permissions: { POST: 'operational_requests.return' } },
  { pattern: /^\/operational-requests\/[^/]+\/submit$/, permissions: { POST: 'operational_requests.submit' } },
  { pattern: /^\/operational-requests\/[^/]+\/financial-processing$/, permissions: { POST: 'operational_requests.finance' } },
  { pattern: /^\/operational-requests\/[^/]+\/(?:cash-voucher|sync-cash-voucher|close)$/, permissions: { POST: 'operational_requests.finance' } },
  { pattern: /^\/operational-requests\/[^/]+\/attachments$/, permissions: { POST: 'operational_requests.manage_attachments' } },
  {
    pattern: /^\/operational-requests(?:\/|$)/,
    permissions: {
      GET: ['operational_requests.read_own', 'operational_requests.read_all', 'operational_requests.finance'],
      POST: 'operational_requests.create',
      PATCH: 'operational_requests.update',
    },
  },
];

module.exports = {
  serviceName: 'OPERATIONAL_REQUESTS',
  basePath: config.SERVICES.OPERATIONAL_REQUESTS,
  pathRewrite: rewritePath,
  limiter: procurementServiceLimiter,
  routes: [{ path: '/operational-requests', auth: true, permissionByPath: operationalRequestPermissionRules }],
};
