const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AccountingMappingService {
  constructor() {
    this.mappings = null;
    this.fallbackAccount = { code: '618', label: 'Autres charges d exploitation' };
    
    // Fallback matériel en cas d'absence totale de la table en DB
    this.hardcodedRules = {
      'INVOICE_REVENUE': { code: '706', label: 'Prestations de services' },
      'INVOICE_DEBIT_CUSTOMER': { code: '411', label: 'Clients' },
      'PAYMENT_CREDIT_CUSTOMER': { code: '411', label: 'Clients' },
      'DECAISSEMENT_CREDIT_SUPPLIER': { code: '401', label: 'Fournisseurs' },
      'DECAISSEMENT_DEBIT_SUPPLIER': { code: '401', label: 'Fournisseurs' }
    };
  }

  /**
   * Charge tous les mappings actifs en mémoire pour des performances optimales
   */
  async refreshCache() {
    try {
      // Vérification sécurisée de l'existence du modèle
      if (!prisma.accountingMapping) {
        console.warn('[AccountingMappingService] Prisma model accountingMapping is undefined. Using emergency fallback.');
        this.mappings = [];
        return;
      }

      this.mappings = await prisma.accountingMapping.findMany({
        where: { isActive: true },
        include: { account: true },
        orderBy: { priority: 'desc' }
      });
      console.log(`[AccountingMappingService] Cache refreshed: ${this.mappings.length} mappings.`);
    } catch (error) {
      console.error('[AccountingMappingService] Error refreshing cache (Database might be out of sync):', error.message);
      this.mappings = [];
    }
  }

  /**
   * Résout un compte comptable basé sur la source et la catégorie
   */
  async resolveAccount(sourceType, category) {
    if (this.mappings === null) await this.refreshCache();

    const normalizedCategory = String(category || '').trim();
    const normalizedSource = String(sourceType || '').toUpperCase();

    // 1. Recherche dans le cache DB si disponible
    if (this.mappings && this.mappings.length > 0) {
      const found = this.mappings.find(m => {
        if (m.sourceType !== normalizedSource) return false;
        if (m.categoryKey === '*') return true;
        return String(normalizedCategory).toLowerCase().includes(m.categoryKey.toLowerCase());
      });

      if (found && found.account) {
        return {
          code: found.account.code,
          label: found.account.label,
          accountId: found.account.id
        };
      }
    }

    // 2. Fallback sur les règles matérielles si DB absente ou règle non trouvée
    const ruleKey = `${normalizedSource}_${normalizedCategory}`.toUpperCase();
    if (this.hardcodedRules[ruleKey]) {
      return this.hardcodedRules[ruleKey];
    }

    // 3. Fallback ultime
    console.log(`[AccountingMappingService] No mapping found for ${normalizedSource}:${normalizedCategory}. Using default fallback.`);
    return this.fallbackAccount;
  }
}

// Singleton
module.exports = new AccountingMappingService();
