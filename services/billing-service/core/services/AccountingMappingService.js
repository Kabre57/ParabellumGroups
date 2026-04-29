const { PrismaClient } = require('@prisma/client');
const {
  getTreasuryFamilyFromPaymentMethod,
  resolveAccountingReference,
} = require('../../utils/accountingAccountResolver');
const prisma = new PrismaClient();

class AccountingMappingService {
  constructor() {
    this.mappings = null;
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

    const semanticFamily = this.resolveSemanticFamily(normalizedSource, normalizedCategory);
    if (semanticFamily) {
      const resolved = await resolveAccountingReference(prisma, semanticFamily);
      if (resolved) {
        return resolved;
      }
    }

    // 3. Fallback ultime sans code hardcodé
    console.log(`[AccountingMappingService] No mapping found for ${normalizedSource}:${normalizedCategory}. Returning semantic fallback.`);
    return {
      code: null,
      label: semanticFamily ? `Famille comptable à configurer: ${semanticFamily}` : 'Famille comptable à configurer',
      accountId: null,
    };
  }

  resolveSemanticFamily(sourceType, category) {
    if (sourceType === 'INVOICE' && category === 'REVENUE') {
      return 'REVENUE';
    }

    if (sourceType === 'INVOICE' && category === 'DEBIT_CUSTOMER') {
      return 'CUSTOMER_RECEIVABLE';
    }

    if (sourceType === 'PAYMENT' && category === 'CREDIT_CUSTOMER') {
      return 'CUSTOMER_RECEIVABLE';
    }

    if (sourceType === 'PAYMENT' && category) {
      return getTreasuryFamilyFromPaymentMethod(category);
    }

    if (sourceType === 'DECAISSEMENT' && ['CREDIT_SUPPLIER', 'DEBIT_SUPPLIER'].includes(category)) {
      return 'SUPPLIER_PAYABLE';
    }

    if (sourceType === 'PURCHASE_ORDER' || sourceType === 'PURCHASE_QUOTE') {
      return 'PURCHASE_EXPENSE';
    }

    if (sourceType === 'INVOICE' || sourceType === 'ENCAISSEMENT') {
      return 'REVENUE';
    }

    if (sourceType === 'DECAISSEMENT' || sourceType === 'CASH_VOUCHER') {
      const normalizedCategory = String(category || '').toLowerCase();
      if (
        normalizedCategory.includes('achat') ||
        normalizedCategory.includes('fournisseur') ||
        normalizedCategory.includes('marchandise')
      ) {
        return 'PURCHASE_EXPENSE';
      }
      return 'MISC_EXPENSE';
    }

    return null;
  }
}

// Singleton
module.exports = new AccountingMappingService();
