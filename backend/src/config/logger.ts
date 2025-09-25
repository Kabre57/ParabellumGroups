import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Format personnalisé pour les logs en développement
const developmentFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Configuration des transports
const transports: winston.transport[] = [];

// Console transport (toujours actif)
transports.push(
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      process.env.NODE_ENV === 'development' ? developmentFormat : json()
    )
  })
);

// File transports (seulement en production)
if (process.env.NODE_ENV === 'production') {
  // Logs d'erreur
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );

  // Logs combinés
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    })
  );

  // Logs d'audit (actions sensibles)
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '50m',
      maxFiles: '90d',
      format: combine(
        timestamp(),
        json()
      )
    })
  );
}

// Créer le logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'parabellum-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  // Ne pas quitter sur les erreurs
  exitOnError: false
});

// Logger spécialisé pour l'audit
export const auditLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: {
    service: 'parabellum-audit',
    type: 'audit'
  },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [AUDIT]: ${message} ${JSON.stringify(meta)}`;
        })
      )
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '365d',
        format: combine(
          timestamp(),
          json()
        )
      })
    ] : [])
  ]
});

// Logger pour les performances
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: {
    service: 'parabellum-performance',
    type: 'performance'
  },
  transports: [
    ...(process.env.NODE_ENV === 'production' ? [
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'performance-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        format: combine(
          timestamp(),
          json()
        )
      })
    ] : [])
  ]
});

// Fonction utilitaire pour logger les erreurs avec contexte
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context
  });
};

// Fonction utilitaire pour logger les actions d'audit
export const logAudit = (action: string, userId: number, details: any) => {
  auditLogger.info(action, {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// Fonction utilitaire pour logger les performances
export const logPerformance = (operation: string, duration: number, details?: any) => {
  performanceLogger.info(operation, {
    operation,
    duration,
    details,
    timestamp: new Date().toISOString()
  });
};

export default logger;