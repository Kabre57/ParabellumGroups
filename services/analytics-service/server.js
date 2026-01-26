const express = require('express');
const cors = require('cors');
require('dotenv').config();

const dashboardRoutes = require('./routes/dashboard.routes');
const widgetRoutes = require('./routes/widget.routes');
const rapportRoutes = require('./routes/rapport.routes');
const kpiRoutes = require('./routes/kpi.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/dashboards', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Analytics Service',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur'
  });
});

const PORT = process.env.PORT || 4013;

app.listen(PORT, () => {
  console.log(`Analytics Service démarré sur le port ${PORT}`);
});
