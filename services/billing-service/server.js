require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const factureRoutes = require('./routes/facture.routes');
const paiementRoutes = require('./routes/paiement.routes');
const devisRoutes = require('./routes/devis.routes');
const purchaseCommitmentRoutes = require('./routes/purchaseCommitment.routes');
const internalProcurementEventRoutes = require('./routes/internalProcurementEvent.routes');
const cashVoucherRoutes = require('./routes/cashVoucher.routes');
const accountingRoutes = require('./routes/accounting.routes');

app.use('/api/factures', factureRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/purchase-commitments', purchaseCommitmentRoutes);
app.use('/api/cash-vouchers', cashVoucherRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/internal/procurement-events', internalProcurementEventRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Billing Service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Billing Service API',
    version: '1.0.0',
    endpoints: {
      factures: '/api/factures',
      paiements: '/api/paiements',
      devis: '/api/devis',
      purchaseCommitments: '/api/purchase-commitments',
      cashVouchers: '/api/cash-vouchers',
      accounting: '/api/accounting/overview',
      health: '/health'
    }
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Billing Service démarré sur le port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API Factures: http://localhost:${PORT}/api/factures`);
  console.log(`💰 API Paiements: http://localhost:${PORT}/api/paiements`);
  console.log(`📝 API Devis: http://localhost:${PORT}/api/devis`);
  console.log(`🧾 API Bons de caisse: http://localhost:${PORT}/api/cash-vouchers`);
  console.log(`📚 API Comptable: http://localhost:${PORT}/api/accounting/overview`);
});

module.exports = app;
