const config = require('../../utils/config');
const { projectsServiceLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour projects-service
 *
 * - /api/projects -> /api/projets
 * - /api/projects/:id/tasks -> /api/taches?projetId=:id
 *
 * Note: les requêtes arrivent souvent préfixées par /api,
 * on normalise donc /projects et /api/projects.
 */
const rewriteProjectsPath = (path) => {
  console.log('[Projects Path Rewrite] Original path:', path);
  // Gestion des routes taches imbriquées
  const tasksMatch = path.match(/^\/(?:api\/)?projects\/([^\/]+)\/tasks(\/[^?]*)?(\?.*)?$/);
  if (tasksMatch) {
    const projectId = tasksMatch[1];
    const tail = tasksMatch[2] || '';
    const query = tasksMatch[3] || '';
    const queryPrefix = query ? `${query}&` : '?';
    const rewritten = `/api/taches${tail}${queryPrefix}projetId=${encodeURIComponent(projectId)}`;
    console.log('[Projects Path Rewrite] Rewritten to:', rewritten);
    return rewritten;
  }

  // Normalisation du préfixe principal
  const rewritten = path
    .replace(/^\/api\/projects/, '/api/projets')
    .replace(/^\/projects/, '/api/projets');
  console.log('[Projects Path Rewrite] Rewritten to:', rewritten);
  return rewritten;
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
      permission: {
        GET: 'projects.read',
        POST: 'projects.create',
        PUT: 'projects.update',
        PATCH: 'projects.update',
        DELETE: 'projects.delete'
      },
    },
  ],
};
