require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateUser } = require('./middleware/auth');
const { ensureProspectDatabase } = require('./utils/ensureDatabase');
const { startTerrainScheduler } = require('./services/terrainScheduler');

const prospectRoutes = require('./routes/prospect.routes');

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'commercial-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/prospects', authenticateUser, prospectRoutes);

app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  await ensureProspectDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Commercial Service démarré sur le port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    startTerrainScheduler();
  });
};

startServer();

process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

module.exports = app;
