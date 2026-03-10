const config = require('../../utils/config');
const { communicationServiceLimiter } = require('../../middleware/serviceLimiters');

const rewriteMessagePath = (path) => {
  if (path === '/' || path === '') return '/api/messages';
  return path
    .replace(/^\/api\/communication\/messages/, '/api/messages')
    .replace(/^\/communication\/messages/, '/api/messages')
    .replace(/^\/messages/, '/api/messages');
};

const rewriteCampaignPath = (path) => {
  if (path === '/' || path === '') return '/api/campagnes';
  return path
    .replace(/^\/api\/communication\/campagnes/, '/api/campagnes')
    .replace(/^\/communication\/campagnes/, '/api/campagnes')
    .replace(/^\/campagnes/, '/api/campagnes');
};

const rewriteTemplatePath = (path) => {
  if (path === '/' || path === '') return '/api/templates';
  return path
    .replace(/^\/api\/communication\/templates/, '/api/templates')
    .replace(/^\/communication\/templates/, '/api/templates')
    .replace(/^\/templates/, '/api/templates');
};

module.exports = {
  serviceName: 'COMMUNICATION',
  basePath: config.SERVICES.COMMUNICATION,
  limiter: communicationServiceLimiter,

  routes: [
    {
      path: '/communication/messages',
      auth: true,
      pathRewrite: rewriteMessagePath,
      permission: {
        GET: 'messages.read',
        POST: 'messages.send',
        PUT: 'messages.send',
        PATCH: 'messages.send',
        DELETE: 'messages.delete',
      },
    },
    {
      path: '/communication/campagnes',
      auth: true,
      pathRewrite: rewriteCampaignPath,
      permission: {
        GET: 'emails.read',
        POST: 'emails.send_bulk',
        PUT: 'emails.send_bulk',
        PATCH: 'emails.send_bulk',
        DELETE: 'emails.send_bulk',
      },
    },
    {
      path: '/communication/templates',
      auth: true,
      pathRewrite: rewriteTemplatePath,
      permission: {
        GET: 'emails.manage_templates',
        POST: 'emails.manage_templates',
        PUT: 'emails.manage_templates',
        PATCH: 'emails.manage_templates',
        DELETE: 'emails.manage_templates',
      },
    },
  ],
};
