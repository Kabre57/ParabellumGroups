const CircuitBreaker = require('opossum');
const { logInfo, logError } = require('../utils/logger');

/**
 * Options par défaut pour les Circuit Breakers
 */
const defaultOptions = {
  timeout: 10000,                    // Timeout après 10 secondes
  errorThresholdPercentage: 50,      // Ouvre le circuit si 50% des requêtes échouent
  resetTimeout: 30000,               // Réessaye après 30 secondes
  rollingCountTimeout: 10000,        // Fenêtre glissante de 10 secondes
  rollingCountBuckets: 10,           // 10 buckets pour les statistiques
  name: 'default-breaker',
  volumeThreshold: 5                 // Minimum 5 requêtes avant d'évaluer
};

/**
 * Crée un Circuit Breaker pour un service
 * @param {Function} asyncFunction - Fonction asynchrone à protéger
 * @param {string} serviceName - Nom du service
 * @param {Object} customOptions - Options personnalisées
 * @returns {CircuitBreaker} Instance du circuit breaker
 */
function createCircuitBreaker(asyncFunction, serviceName, customOptions = {}) {
  const options = {
    ...defaultOptions,
    ...customOptions,
    name: `${serviceName}-breaker`
  };

  const breaker = new CircuitBreaker(asyncFunction, options);

  // Fallback en cas d'ouverture du circuit
  breaker.fallback(() => {
    logError(`Circuit breaker OPEN for ${serviceName}`);
    return {
      success: false,
      error: 'Service temporairement indisponible',
      message: `Le service ${serviceName} est actuellement indisponible. Veuillez réessayer dans quelques instants.`,
      serviceName,
      circuitState: 'OPEN'
    };
  });

  // Event listeners pour monitoring
  breaker.on('open', () => {
    logError(`Circuit breaker OPENED for ${serviceName}`);
  });

  breaker.on('halfOpen', () => {
    logInfo(`Circuit breaker HALF-OPEN for ${serviceName} - Testing...`);
  });

  breaker.on('close', () => {
    logInfo(`Circuit breaker CLOSED for ${serviceName} - Service recovered`);
  });

  breaker.on('success', (result) => {
    // Log silencieux pour les succès (peut être activé pour debug)
  });

  breaker.on('failure', (error) => {
    logError(`Circuit breaker failure for ${serviceName}:`, error);
  });

  breaker.on('timeout', () => {
    logError(`Circuit breaker timeout for ${serviceName}`);
  });

  breaker.on('reject', () => {
    logError(`Circuit breaker rejected request for ${serviceName} (circuit is OPEN)`);
  });

  return breaker;
}

/**
 * Obtient les statistiques d'un circuit breaker
 * @param {CircuitBreaker} breaker - Instance du circuit breaker
 * @returns {Object} Statistiques
 */
function getBreakerStats(breaker) {
  const stats = breaker.stats;
  return {
    name: breaker.name,
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
    failures: stats.failures,
    successes: stats.successes,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    fires: stats.fires,
    latencyMean: stats.latencyMean,
    percentiles: {
      '0.0': stats.percentiles['0.0'],
      '0.25': stats.percentiles['0.25'],
      '0.5': stats.percentiles['0.5'],
      '0.75': stats.percentiles['0.75'],
      '0.9': stats.percentiles['0.9'],
      '0.95': stats.percentiles['0.95'],
      '0.99': stats.percentiles['0.99'],
      '0.995': stats.percentiles['0.995'],
      '1.0': stats.percentiles['1.0']
    }
  };
}

/**
 * Health check pour un circuit breaker
 * @param {CircuitBreaker} breaker - Instance du circuit breaker
 * @returns {Object} État de santé
 */
function getBreakerHealth(breaker) {
  const stats = breaker.stats;
  const totalRequests = stats.fires;
  const failureRate = totalRequests > 0 ? (stats.failures / totalRequests) * 100 : 0;

  return {
    name: breaker.name,
    healthy: !breaker.opened,
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
    failureRate: failureRate.toFixed(2) + '%',
    totalRequests,
    successRate: totalRequests > 0 ? ((stats.successes / totalRequests) * 100).toFixed(2) + '%' : '0%'
  };
}

module.exports = {
  createCircuitBreaker,
  getBreakerStats,
  getBreakerHealth
};
