require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,
  JWT_SECRET: process.env.JWT_SECRET,
  
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'],
  
  SERVICES: {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    COMMUNICATION: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:4002',
    TECHNICAL: process.env.TECHNICAL_SERVICE_URL || 'http://localhost:4003',
    COMMERCIAL: process.env.COMMERCIAL_SERVICE_URL || 'http://localhost:4004',
    INVENTORY: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4005',
    PROJECTS: process.env.PROJECTS_SERVICE_URL || 'http://localhost:4006',
    PROCUREMENT: process.env.PROCUREMENT_SERVICE_URL || 'http://localhost:4007',
    CUSTOMERS: process.env.CUSTOMERS_SERVICE_URL || 'http://localhost:4008',
    HR: process.env.HR_SERVICE_URL || 'http://localhost:4009',
    BILLING: process.env.BILLING_SERVICE_URL || 'http://localhost:4010',
    ANALYTICS: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4011',
    NOTIFICATIONS: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4012'
  },
  
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

module.exports = config;
