const promClient = require('prom-client');

// Créer un registre pour les métriques
const register = new promClient.Registry();

// Ajouter les métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'api_gateway_'
});

/**
 * Métrique: Durée des requêtes HTTP
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]  // Buckets en secondes
});
register.registerMetric(httpRequestDuration);

/**
 * Métrique: Nombre total de requêtes HTTP
 */
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});
register.registerMetric(httpRequestsTotal);

/**
 * Métrique: Requêtes en cours
 */
const httpRequestsInProgress = new promClient.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'service']
});
register.registerMetric(httpRequestsInProgress);

/**
 * Métrique: Taille des requêtes
 */
const httpRequestSizeBytes = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});
register.registerMetric(httpRequestSizeBytes);

/**
 * Métrique: Taille des réponses
 */
const httpResponseSizeBytes = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});
register.registerMetric(httpResponseSizeBytes);

/**
 * Métrique: État des Circuit Breakers
 */
const circuitBreakerState = new promClient.Gauge({
  name: 'circuit_breaker_state',
  help: 'State of circuit breakers (0=closed, 1=half-open, 2=open)',
  labelNames: ['service']
});
register.registerMetric(circuitBreakerState);

/**
 * Métrique: Erreurs du Circuit Breaker
 */
const circuitBreakerErrors = new promClient.Counter({
  name: 'circuit_breaker_errors_total',
  help: 'Total number of circuit breaker errors',
  labelNames: ['service', 'type']  // type: timeout, failure, reject
});
register.registerMetric(circuitBreakerErrors);

/**
 * Métrique: Nombre de connexions actives
 */
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections to backend services',
  labelNames: ['service']
});
register.registerMetric(activeConnections);

/**
 * Métrique: Erreurs d'authentification
 */
const authErrors = new promClient.Counter({
  name: 'auth_errors_total',
  help: 'Total number of authentication errors',
  labelNames: ['type']  // type: invalid_token, expired_token, missing_token
});
register.registerMetric(authErrors);

/**
 * Métrique: Rate limiting
 */
const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['route', 'ip']
});
register.registerMetric(rateLimitHits);

/**
 * Middleware pour collecter les métriques HTTP
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  const route = req.route?.path || req.path;
  const service = extractServiceFromPath(req.path);

  // Incrémenter les requêtes en cours
  httpRequestsInProgress.inc({ method: req.method, service });

  // Enregistrer la taille de la requête
  const requestSize = parseInt(req.get('content-length') || '0', 10);
  if (requestSize > 0) {
    httpRequestSizeBytes.observe({ method: req.method, route, service }, requestSize);
  }

  // Capturer la fin de la requête
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convertir en secondes
    const statusCode = res.statusCode;

    // Décrémenter les requêtes en cours
    httpRequestsInProgress.dec({ method: req.method, service });

    // Enregistrer la durée
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode, service },
      duration
    );

    // Incrémenter le compteur total
    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode, service });

    // Enregistrer la taille de la réponse
    const responseSize = parseInt(res.get('content-length') || '0', 10);
    if (responseSize > 0) {
      httpResponseSizeBytes.observe(
        { method: req.method, route, status_code: statusCode, service },
        responseSize
      );
    }
  });

  next();
}

/**
 * Extrait le nom du service depuis le chemin de la requête
 */
function extractServiceFromPath(path) {
  const match = path.match(/^\/api\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Met à jour l'état d'un Circuit Breaker
 */
function updateCircuitBreakerState(serviceName, state) {
  const stateValue = state === 'open' ? 2 : state === 'halfOpen' ? 1 : 0;
  circuitBreakerState.set({ service: serviceName }, stateValue);
}

/**
 * Enregistre une erreur de Circuit Breaker
 */
function recordCircuitBreakerError(serviceName, errorType) {
  circuitBreakerErrors.inc({ service: serviceName, type: errorType });
}

/**
 * Enregistre une erreur d'authentification
 */
function recordAuthError(errorType) {
  authErrors.inc({ type: errorType });
}

/**
 * Enregistre un hit de rate limiting
 */
function recordRateLimitHit(route, ip) {
  rateLimitHits.inc({ route, ip });
}

/**
 * Met à jour le nombre de connexions actives
 */
function updateActiveConnections(serviceName, delta) {
  if (delta > 0) {
    activeConnections.inc({ service: serviceName }, delta);
  } else {
    activeConnections.dec({ service: serviceName }, Math.abs(delta));
  }
}

/**
 * Endpoint pour exposer les métriques
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err);
  }
}

/**
 * Réinitialise toutes les métriques (utile pour les tests)
 */
function resetMetrics() {
  register.resetMetrics();
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  updateCircuitBreakerState,
  recordCircuitBreakerError,
  recordAuthError,
  recordRateLimitHit,
  updateActiveConnections,
  resetMetrics,
  register
};
