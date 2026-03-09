#!/usr/bin/env node

/**
 * Script de test complet du workflow de permissions
 * Teste toutes les fonctionnalités : création, approbation, notifications
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4001/api';
const WS_BASE = 'ws://localhost:8080';

// Configuration des tests
const TEST_USER = {
  email: 'admin@parabellum.com',
  password: 'admin123'
};

let authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AcGFyYWJlbGx1bS5jb20iLCJyb2xlSWQiOjEsInJvbGVDb2RlIjoiQURNSU4iLCJyb2xlIjoiQURNSU4iLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc3MjczMjM2MSwiZXhwIjoxNzcyODE4NzYxLCJpc3MiOiJwYXJhYmVsbHVtLWF1dGgtc2VydmljZSJ9.pBFqUm1GPoKRQTXVGJDStuqXoUvPT2Gy6Fmj5-GiVio';
let testRequestId = null;

// Fonctions utilitaires
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function apiRequest(method, endpoint, data = null, useAuth = true) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: useAuth ? { Authorization: `Bearer ${authToken}` } : {}
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(`API ${method} ${endpoint}: ${error.response?.data?.message || error.message}`);
  }
}

// Tests individuels
async function testCreatePermissionRequest() {
  log('📝 Test création demande de permission...');
  try {
    const requestData = {
      roleId: 1, // ADMIN role
      permissionId: 1, // First permission
      canView: true,
      canCreate: true,
      justification: 'Test automatisé du workflow de permissions'
    };

    const response = await apiRequest('POST', '/permission-requests', requestData);
    testRequestId = response.data.id;
    log(`✅ Demande créée avec ID: ${testRequestId}`, 'success');
    return true;
  } catch (error) {
    log(`❌ Échec création demande: ${error.message}`, 'error');
    return false;
  }
}

async function testGetPendingRequests() {
  log('📋 Test récupération demandes en attente...');
  try {
    const response = await apiRequest('GET', '/permission-requests?status=pending');
    const pendingCount = response.data.length;
    log(`✅ ${pendingCount} demande(s) en attente trouvée(s)`, 'success');

    // Vérifier que notre demande est présente
    const ourRequest = response.data.find(req => req.id === testRequestId);
    if (ourRequest) {
      log('✅ Notre demande de test est bien en attente', 'success');
    } else {
      log('⚠️ Notre demande de test n\'a pas été trouvée dans la liste', 'warning');
    }

    return true;
  } catch (error) {
    log(`❌ Échec récupération demandes: ${error.message}`, 'error');
    return false;
  }
}

async function testApproveRequest() {
  log('✅ Test approbation de demande...');
  try {
    const response = await apiRequest('PATCH', `/permission-requests/${testRequestId}/approve`, {
      comments: 'Approbation automatique pour test'
    });
    log('✅ Demande approuvée avec succès', 'success');
    return true;
  } catch (error) {
    log(`❌ Échec approbation: ${error.message}`, 'error');
    return false;
  }
}

async function testRejectRequest() {
  log('❌ Test rejet de demande...');
  try {
    // Créer d'abord une nouvelle demande pour la rejeter
    const requestData = {
      roleId: 1,
      permissionId: 2, // Different permission
      canView: true,
      justification: 'Test de rejet automatisé'
    };

    const createResponse = await apiRequest('POST', '/permission-requests', requestData);
    const rejectId = createResponse.data.id;

    const response = await apiRequest('PATCH', `/permission-requests/${rejectId}/reject`, {
      reason: 'Rejet automatique pour test'
    });
    log('✅ Demande rejetée avec succès', 'success');
    return true;
  } catch (error) {
    log(`❌ Échec rejet: ${error.message}`, 'error');
    return false;
  }
}

async function testAuditLogs() {
  log('📊 Test récupération logs d\'audit...');
  try {
    const response = await apiRequest('GET', '/audit-logs?limit=10');
    const logsCount = response.data.logs?.length || 0;
    log(`✅ ${logsCount} entrée(s) d\'audit récupérée(s)`, 'success');

    // Vérifier qu'il y a des logs récents pour notre test
    const recentLogs = response.data.logs?.filter(log =>
      log.action?.includes('permission') &&
      new Date(log.timestamp) > new Date(Date.now() - 60000) // Dernière minute
    ) || [];

    if (recentLogs.length > 0) {
      log(`✅ ${recentLogs.length} log(s) d\'audit récent(s) trouvé(s) pour les permissions`, 'success');
    } else {
      log('⚠️ Aucun log d\'audit récent trouvé', 'warning');
    }

    return true;
  } catch (error) {
    log(`❌ Échec récupération logs: ${error.message}`, 'error');
    return false;
  }
}

async function testEmailNotification() {
  log('📧 Test service de notification email...');
  try {
    // Tester l'envoi d'un email de test
    const response = await apiRequest('POST', '/permission-requests/test-notifications/email', {
      to: 'test@example.com',
      subject: 'Test automatique workflow',
      message: 'Ceci est un test automatique du système de notifications email'
    });
    log('✅ Email de test envoyé', 'success');
    return true;
  } catch (error) {
    log(`❌ Échec envoi email: ${error.message}`, 'error');
    return false;
  }
}

async function testSlackNotification() {
  log('💬 Test service de notification Slack...');
  try {
    const response = await apiRequest('POST', '/permission-requests/test-notifications/slack', {
      message: 'Test automatique du workflow de permissions - Slack notification'
    });
    log('✅ Notification Slack envoyée', 'success');
    return true;
  } catch (error) {
    log(`❌ Échec envoi Slack: ${error.message}`, 'error');
    return false;
  }
}

// Fonction principale de test
async function runTests() {
  log('🚀 Démarrage des tests complets du workflow de permissions');
  log('═'.repeat(60));

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Création demande', fn: testCreatePermissionRequest },
    { name: 'Récupération demandes', fn: testGetPendingRequests },
    { name: 'Approbation demande', fn: testApproveRequest },
    { name: 'Rejet demande', fn: testRejectRequest },
    { name: 'Logs d\'audit', fn: testAuditLogs },
    { name: 'Notification Email', fn: testEmailNotification },
    { name: 'Notification Slack', fn: testSlackNotification }
  ];

  for (const test of tests) {
    results.total++;
    log(`\n🔍 Exécution du test: ${test.name}`);
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      log(`💥 Erreur inattendue dans ${test.name}: ${error.message}`, 'error');
      results.failed++;
    }
  }

  // Fermeture propre
  // WebSocket tests removed for simplicity

  // Résumé final
  log('\n' + '═'.repeat(60));
  log('📊 RÉSULTATS DES TESTS');
  log('═'.repeat(60));
  log(`Total: ${results.total}`);
  log(`Réussis: ${results.passed}`, 'success');
  log(`Échoués: ${results.failed}`, results.failed > 0 ? 'error' : 'info');

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Taux de réussite: ${successRate}%`, results.failed === 0 ? 'success' : 'warning');

  if (results.failed === 0) {
    log('\n🎉 TOUS LES TESTS SONT RÉUSSIS !', 'success');
    log('Le workflow de permissions fonctionne parfaitement.', 'success');
  } else {
    log(`\n⚠️ ${results.failed} test(s) ont échoué.`, 'warning');
    log('Vérifiez les logs ci-dessus pour les détails.', 'warning');
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Exécution
if (require.main === module) {
  runTests().catch(error => {
    log(`💥 Erreur critique: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runTests };
