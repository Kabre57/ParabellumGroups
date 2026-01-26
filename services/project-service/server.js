require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const projetRoutes = require('./routes/projet.routes');
const tacheRoutes = require('./routes/tache.routes');
const jalonRoutes = require('./routes/jalon.routes');

const app = express();
const PORT = process.env.PORT || 4008;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/projets', projetRoutes);
app.use('/api/taches', tacheRoutes);
app.use('/api/jalons', jalonRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'project-service',
    timestamp: new Date().toISOString() 
  });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({ 
    message: 'Project Service API',
    version: '1.0.0',
    endpoints: {
      projets: '/api/projets',
      taches: '/api/taches',
      jalons: '/api/jalons',
      health: '/health'
    }
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Project Service démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
