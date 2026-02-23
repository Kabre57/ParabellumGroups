require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const articleRoutes = require('./routes/article.routes');
const mouvementRoutes = require('./routes/mouvement.routes');
const inventaireRoutes = require('./routes/inventaire.routes');
const equipementRoutes = require('./routes/equipement.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const receptionRoutes = require('./routes/reception.routes');

const app = express();
const PORT = process.env.PORT || 4005;

// Middlewares de sécurité
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite par IP
});
app.use(limiter);

// Routes
app.use('/api/articles', articleRoutes);
app.use('/api/mouvements', mouvementRoutes);
app.use('/api/inventaires', inventaireRoutes);
app.use('/api/equipements', equipementRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/receptions', receptionRoutes);

// Compatibilite avec les routes passees via /api/inventory/*
app.use('/api/inventory/articles', articleRoutes);
app.use('/api/inventory/mouvements', mouvementRoutes);
app.use('/api/inventory/inventaires', inventaireRoutes);
app.use('/api/inventory/equipements', equipementRoutes);
app.use('/api/inventory/maintenances', maintenanceRoutes);
app.use('/api/inventory/receptions', receptionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'inventory-service',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Inventory Service démarré sur le port ${PORT}`);
});

module.exports = app;
