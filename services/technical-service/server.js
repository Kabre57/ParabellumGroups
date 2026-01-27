require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateUser } = require('./middleware/auth');
const { convertPagination, formatPaginationResponse } = require('./middleware/pagination');

const specialiteRoutes = require('./routes/specialite.routes');
const technicienRoutes = require('./routes/technicien.routes');
const missionRoutes = require('./routes/mission.routes');
const interventionRoutes = require('./routes/intervention.routes');
const rapportRoutes = require('./routes/rapport.routes');
const materielRoutes = require('./routes/materiel.routes');

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
// Supprimez ou commentez cette ligne - CORS est géré par l'API Gateway
// app.use(cors({
//   origin: process.env.CORS_ORIGIN || '*',
//   credentials: true
// }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Technical Service is running',
    service: 'technical-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/specialites', authenticateUser, specialiteRoutes);
app.use('/api/techniciens', authenticateUser, technicienRoutes);
app.use('/api/missions', authenticateUser, missionRoutes);
app.use('/api/interventions', authenticateUser, interventionRoutes);
app.use('/api/rapports', authenticateUser, rapportRoutes);
app.use('/api/materiel', authenticateUser, materielRoutes);

app.use(convertPagination);
app.use(formatPaginationResponse);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`✓ Technical Service démarré sur le port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});
