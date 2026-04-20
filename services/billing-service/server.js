require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./middleware/auth');

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 4010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authenticateToken);

// Routes
const factureRoutes = require('./routes/facture.routes');
const paiementRoutes = require('./routes/paiement.routes');
const devisRoutes = require('./routes/devis.routes');
const avoirRoutes = require('./routes/avoir.routes');
const purchaseCommitmentRoutes = require('./routes/purchaseCommitment.routes');
const internalProcurementEventRoutes = require('./routes/internalProcurementEvent.routes');
const encaissementRoutes = require('./routes/encaissement.routes');
const decaissementRoutes = require('./routes/decaissement.routes');
const factureFournisseurRoutes = require('./routes/factureFournisseur.routes');
const accountingRoutes = require('./routes/accounting.routes');
const treasuryAccountRoutes = require('./routes/treasuryAccount.routes');
const treasuryClosureRoutes = require('./routes/treasuryClosure.routes');
const cashVoucherRoutes = require('./routes/cashVoucher.routes');
const placementRoutes = require('./routes/placement.routes');
const budgetRoutes = require('./routes/budget.routes');

app.use('/api/factures', factureRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/avoirs', avoirRoutes);
app.use('/api/purchase-commitments', purchaseCommitmentRoutes);
app.use('/api/encaissements', encaissementRoutes);
app.use('/api/decaissements', decaissementRoutes);
app.use('/api/factures-fournisseurs', factureFournisseurRoutes);
app.use('/api/treasury-accounts', treasuryAccountRoutes);
app.use('/api/treasury-closures', treasuryClosureRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/cash-vouchers', cashVoucherRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/budgets', budgetRoutes);
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
      avoirs: '/api/avoirs',
      purchaseCommitments: '/api/purchase-commitments',
      encaissements: '/api/encaissements',
      decaissements: '/api/decaissements',
      facturesFournisseurs: '/api/factures-fournisseurs',
      treasuryAccounts: '/api/treasury-accounts',
      treasuryClosures: '/api/treasury-closures',
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
  console.error('[Global Error]', err.stack);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Erreur interne du serveur',
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined 
  });
});

// Démarrage du serveur avec vérification BDD
const startServer = async () => {
  try {
    console.log('🔄 Tentative de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie.');

    app.listen(PORT, () => {
      console.log(`🚀 Billing Service démarré sur le port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📄 API Factures: http://localhost:${PORT}/api/factures`);
      console.log(`💰 API Paiements: http://localhost:${PORT}/api/paiements`);
      console.log(`📝 API Devis: http://localhost:${PORT}/api/devis`);
      console.log(`📥 API Encaissements: http://localhost:${PORT}/api/encaissements`);
      console.log(`📤 API Décaissements: http://localhost:${PORT}/api/decaissements`);
      console.log(`🧾 API Factures Fournisseurs: http://localhost:${PORT}/api/factures-fournisseurs`);
      console.log(`🏦 API Comptes de trésorerie: http://localhost:${PORT}/api/treasury-accounts`);
      console.log(`🧾 API Clôtures de caisse: http://localhost:${PORT}/api/treasury-closures`);
      console.log(`📚 API Comptable: http://localhost:${PORT}/api/accounting/overview`);
    });
  } catch (error) {
    console.error('❌ Échec critique lors de la connexion à la base de données:', error.message);
    console.error('Vérifiez votre variable DATABASE_URL et le réseau.');
    process.exit(1);
  }
};

startServer();

module.exports = app;
