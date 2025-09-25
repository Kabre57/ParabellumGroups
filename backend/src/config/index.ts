// Configuration centralisée de l'application
import { logger } from './logger';

// Validation des variables d'environnement critiques
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const validateEnvironment = (): void => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('❌ Variables d\'environnement manquantes:', missingVars);
    process.exit(1);
  }
  
  logger.info('✅ Variables d\'environnement validées');
};

// Configuration de l'application
export const config = {
  // Environnement
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  
  // Base de données
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5174',
    'http://localhost:3001'
  ],
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@parabellum.com',
  
  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  
  // API
  API_VERSION: process.env.API_VERSION || 'v1',
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}/api/v1`,
  
  // Sécurité
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-session-secret',
  
  // Fonctionnalités
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  ENABLE_CACHE: process.env.ENABLE_CACHE !== 'false',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  
  // Entreprise
  COMPANY_NAME: process.env.COMPANY_NAME || 'Parabellum Groups',
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS || 'Abidjan, Côte d\'Ivoire',
  COMPANY_PHONE: process.env.COMPANY_PHONE || '+225 07 07 07 07 07',
  COMPANY_EMAIL: process.env.COMPANY_EMAIL || 'contact@parabellum.com',
  COMPANY_WEBSITE: process.env.COMPANY_WEBSITE || 'https://parabellum.com',
  
  // Facturation
  INVOICE_PREFIX: process.env.INVOICE_PREFIX || 'FAC',
  QUOTE_PREFIX: process.env.QUOTE_PREFIX || 'DEV',
  PAYMENT_PREFIX: process.env.PAYMENT_PREFIX || 'PAY',
  DEFAULT_VAT_RATE: parseFloat(process.env.DEFAULT_VAT_RATE || '18.0'),
  DEFAULT_PAYMENT_TERMS: parseInt(process.env.DEFAULT_PAYMENT_TERMS || '30'),
  
  // Validation
  validate: validateEnvironment
};

// Valider la configuration au démarrage
config.validate();

// Fonctions utilitaires de configuration
export const isDevelopment = (): boolean => config.NODE_ENV === 'development';
export const isProduction = (): boolean => config.NODE_ENV === 'production';
export const isTest = (): boolean => config.NODE_ENV === 'test';

// Configuration des timeouts
export const TIMEOUTS = {
  DATABASE_QUERY: 30000,     // 30 secondes
  HTTP_REQUEST: 10000,       // 10 secondes
  FILE_UPLOAD: 60000,        // 1 minute
  EMAIL_SEND: 15000,         // 15 secondes
  CACHE_OPERATION: 5000      // 5 secondes
};

// Configuration des limites
export const LIMITS = {
  MAX_ITEMS_PER_QUOTE: 100,
  MAX_ITEMS_PER_INVOICE: 100,
  MAX_SEARCH_RESULTS: 1000,
  MAX_EXPORT_RECORDS: 10000,
  MAX_UPLOAD_SIZE: config.MAX_FILE_SIZE,
  MAX_PAGINATION_LIMIT: 100
};

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Accès non autorisé',
  FORBIDDEN: 'Permission insuffisante',
  NOT_FOUND: 'Ressource non trouvée',
  VALIDATION_ERROR: 'Données invalides',
  INTERNAL_ERROR: 'Erreur interne du serveur',
  DATABASE_ERROR: 'Erreur de base de données',
  CACHE_ERROR: 'Erreur de cache',
  EMAIL_ERROR: 'Erreur d\'envoi d\'email',
  FILE_UPLOAD_ERROR: 'Erreur d\'upload de fichier'
};

// Configuration des formats de date
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  FRENCH_DATE: 'DD/MM/YYYY',
  FRENCH_DATETIME: 'DD/MM/YYYY HH:mm'
};

// Configuration des devises
export const CURRENCY = {
  CODE: 'XOF',
  SYMBOL: 'FCFA',
  DECIMAL_PLACES: 0,
  LOCALE: 'fr-CI'
};

export default config;