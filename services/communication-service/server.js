require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authenticateUser = require('./middleware/auth');
const messageRoutes = require('./routes/message.routes');
const templateRoutes = require('./routes/template.routes');
const notificationRoutes = require('./routes/notification.routes');
const campagneRoutes = require('./routes/campagne.routes');
const emailSender = require('./utils/emailSender');
const { startCampaignScheduler } = require('./services/scheduler.service');
const { ensureCommunicationDatabase } = require('./utils/ensureDatabase');

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(authenticateUser);

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/campagnes', campagneRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'communication-service' });
});

// Démarrage du serveur
const startServer = async () => {
  await ensureCommunicationDatabase();
  app.listen(PORT, () => {
    console.log(`Communication Service démarré sur le port ${PORT}`);
    emailSender.verifyConnection();
    startCampaignScheduler({
      intervalMs: parseInt(process.env.CAMPAIGN_SCHEDULER_INTERVAL_MS || '60000', 10),
    });
  });
};

startServer();
