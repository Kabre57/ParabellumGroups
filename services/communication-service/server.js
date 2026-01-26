require('dotenv').config();
const express = require('express');
const cors = require('cors');
const messageRoutes = require('./routes/message.routes');
const templateRoutes = require('./routes/template.routes');
const notificationRoutes = require('./routes/notification.routes');
const campagneRoutes = require('./routes/campagne.routes');

const app = express();
const PORT = process.env.PORT || 4011;

// Middleware
app.use(cors());
app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`Communication Service démarré sur le port ${PORT}`);
});
