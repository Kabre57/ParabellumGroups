const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service de gestion des Alertes d'Échéance sur les Placements.
 * Conçu pour être exécuté périodiquement (cron quotidien recommandé).
 */
class InvestmentAlertService {

  /**
   * Vérifie toutes les positions ouvertes et crée des alertes
   * pour les actifs dont l'échéance approche dans l'horizon spécifié.
   * @param {number} [horizonDays=30] - Jours d'anticipation
   * @param {string} [portfolioId] - Limiter à un portefeuille (optionnel)
   * @param {Object} [client=prisma]
   */
  async checkMaturities(horizonDays = 30, portfolioId = null, client = prisma) {
    const today = new Date();
    const horizonDate = new Date();
    horizonDate.setDate(today.getDate() + horizonDays);

    const holdingFilter = {
      status: 'OPEN',
      asset: { maturityDate: { lte: horizonDate, gte: today } }
    };
    if (portfolioId) holdingFilter.portfolioId = portfolioId;

    const holdings = await client.investmentHolding.findMany({
      where: holdingFilter,
      include: { asset: true }
    });

    const alerts = [];
    for (const holding of holdings) {
      const asset = holding.asset;
      const daysRemaining = Math.round((new Date(asset.maturityDate) - today) / (1000 * 60 * 60 * 24));

      // Eviter les doublons
      const existing = await client.maturityAlert.findFirst({
        where: { portfolioId: holding.portfolioId, assetId: asset.id, alertType: 'MATURITY', status: 'PENDING' }
      });

      if (!existing) {
        const alert = await client.maturityAlert.create({
          data: {
            portfolioId: holding.portfolioId,
            assetId: asset.id,
            alertType: 'MATURITY',
            triggerDate: today,
            dueDate: new Date(asset.maturityDate),
            status: 'PENDING',
            message: `L'actif "${asset.label}" (${asset.assetCode}) arrive à échéance dans ${daysRemaining} jour(s).`
          }
        });
        alerts.push(alert);
      } else {
        alerts.push(existing);
      }
    }
    return alerts;
  }

  /**
   * Détecte les flux de trésorerie attendus en retard (date dépassée, non encaissés).
   * @param {string} [portfolioId]
   * @param {Object} [client=prisma]
   */
  async checkOverdueCashflows(portfolioId = null, client = prisma) {
    const today = new Date();
    const filter = { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: today } };
    if (portfolioId) filter.portfolioId = portfolioId;

    const overdue = await client.expectedCashflow.findMany({
      where: filter,
      include: { asset: true },
      orderBy: { dueDate: 'asc' }
    });

    const alertsCreated = [];
    for (const flow of overdue) {
      const daysOverdue = Math.round((today - new Date(flow.dueDate)) / (1000 * 60 * 60 * 24));
      const existing = await client.maturityAlert.findFirst({
        where: { portfolioId: flow.portfolioId, assetId: flow.assetId, alertType: 'COUPON', status: 'PENDING', dueDate: flow.dueDate }
      });
      if (!existing) {
        const alert = await client.maturityAlert.create({
          data: {
            portfolioId: flow.portfolioId, assetId: flow.assetId,
            alertType: 'COUPON', triggerDate: today,
            dueDate: new Date(flow.dueDate), status: 'PENDING',
            message: `Flux "${flow.flowType}" de ${flow.expectedAmount} ${flow.currency} sur "${flow.asset.label}" en retard de ${daysOverdue} jour(s).`
          }
        });
        alertsCreated.push(alert);
      }
    }
    return { overdueCashflows: overdue, alertsCreated };
  }

  /**
   * Marque une alerte comme traitée.
   * @param {string} alertId
   * @param {Object} [client=prisma]
   */
  async dismissAlert(alertId, client = prisma) {
    return client.maturityAlert.update({
      where: { id: alertId },
      data: { status: 'DISMISSED', sentAt: new Date() }
    });
  }

  /**
   * Liste les alertes actives avec filtres optionnels.
   * @param {Object} [filters={}]
   * @param {Object} [client=prisma]
   */
  async listAlerts(filters = {}, client = prisma) {
    const where = { status: 'PENDING' };
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    if (filters.alertType) where.alertType = filters.alertType;
    return client.maturityAlert.findMany({ where, orderBy: { dueDate: 'asc' } });
  }
}

module.exports = new InvestmentAlertService();
