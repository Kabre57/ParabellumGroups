const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

const logError = (message, error = {}) => {
  logger.error(message, { error: error.message, stack: error.stack });
};

const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

module.exports = {
  logger,
  logInfo,
  logError,
  logWarn
};
