const config = require('../../utils/config');
const { projectsServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour projects-service
 */
const rewriteProjectsPath = (path) => {
  const tasksMatch = path.match(/^\/projects\/([^\/]+)\/tasks(\/[^?]*)?(\?.*)?$/);
  if (tasksMatch) {
    const projectId = tasksMatch[1];
    const tail = tasksMatch[2] || '';
    const query = tasksMatch[3] || '';
    const queryPrefix = query ? `${query}&` : '?';
    return `/api/taches${tail}${queryPrefix}projetId=${encodeURIComponent(projectId)}`;
  }

  return path.replace(/^\/projects/, '/api/projets');
};

/**
 * Configuration des routes projects-service
 */
module.exports = {
  serviceName: 'PROJECTS',
  basePath: config.SERVICES.PROJECTS,
  pathRewrite: rewriteProjectsPath,
  limiter: projectsServiceLimiter,
  
  routes: [
    {
      path: '/projects',
      auth: true,
    },
  ],
};
