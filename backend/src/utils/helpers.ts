import { logger } from '@/config/logger';
import { config, CURRENCY } from '@/config';

// Utilitaires pour la génération de numéros
export const generateNumber = {
  customer: async (prisma: any): Promise<string> => {
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { customerNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastCustomer) {
      const lastNumber = parseInt(lastCustomer.customerNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    return `CLI-${nextNumber.toString().padStart(3, '0')}`;
  },

  quote: async (prisma: any): Promise<string> => {
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `${config.QUOTE_PREFIX}-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
  },

  invoice: async (prisma: any): Promise<string> => {
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `${config.INVOICE_PREFIX}-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
  },

  payment: async (prisma: any): Promise<string> => {
    const lastPayment = await prisma.payment.findFirst({
      orderBy: { paymentNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `${config.PAYMENT_PREFIX}-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
  },

  employee: async (prisma: any): Promise<string> => {
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastEmployee) {
      const lastNumber = parseInt(lastEmployee.employeeNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    return `EMP-${nextNumber.toString().padStart(4, '0')}`;
  }
};

// Utilitaires pour les calculs financiers
export const calculations = {
  // Calculer le total HT d'une ligne
  calculateLineTotal: (quantity: number, unitPrice: number, discountRate: number = 0): number => {
    return quantity * unitPrice * (1 - discountRate / 100);
  },

  // Calculer la TVA
  calculateVat: (amountHt: number, vatRate: number): number => {
    return amountHt * (vatRate / 100);
  },

  // Calculer le total TTC
  calculateTotalTtc: (amountHt: number, vatAmount: number): number => {
    return amountHt + vatAmount;
  },

  // Calculer les totaux d'un document (devis/facture)
  calculateDocumentTotals: (items: any[]): {
    subtotalHt: number;
    totalVat: number;
    totalTtc: number;
  } => {
    let subtotalHt = 0;
    let totalVat = 0;

    items.forEach(item => {
      const lineTotal = calculations.calculateLineTotal(
        item.quantity,
        item.unitPriceHt,
        item.discountRate || 0
      );
      const lineVat = calculations.calculateVat(lineTotal, item.vatRate);
      
      subtotalHt += lineTotal;
      totalVat += lineVat;
    });

    return {
      subtotalHt: Math.round(subtotalHt * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      totalTtc: Math.round((subtotalHt + totalVat) * 100) / 100
    };
  },

  // Calculer les jours entre deux dates
  calculateDaysBetween: (startDate: Date, endDate: Date): number => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  },

  // Calculer le salaire net
  calculateNetSalary: (
    baseSalary: number,
    overtime: number = 0,
    bonuses: number = 0,
    allowances: number = 0,
    socialContributions: number = 0,
    taxes: number = 0,
    otherDeductions: number = 0
  ): {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
  } => {
    const grossSalary = baseSalary + overtime + bonuses + allowances;
    const totalDeductions = socialContributions + taxes + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary: Math.round(grossSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    };
  }
};

// Utilitaires pour le formatage
export const formatters = {
  // Formater un montant en devise
  currency: (amount: number): string => {
    return new Intl.NumberFormat(CURRENCY.LOCALE, {
      style: 'currency',
      currency: CURRENCY.CODE,
      minimumFractionDigits: CURRENCY.DECIMAL_PLACES,
      maximumFractionDigits: CURRENCY.DECIMAL_PLACES
    }).format(amount);
  },

  // Formater une date
  date: (date: Date, format: 'short' | 'long' | 'iso' = 'short'): string => {
    switch (format) {
      case 'long':
        return new Intl.DateTimeFormat('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      case 'iso':
        return date.toISOString();
      default:
        return new Intl.DateTimeFormat('fr-FR').format(date);
    }
  },

  // Formater un pourcentage
  percentage: (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  },

  // Formater un numéro de téléphone
  phone: (phone: string): string => {
    // Supprimer tous les caractères non numériques
    const cleaned = phone.replace(/\D/g, '');
    
    // Format ivoirien : +225 07 07 07 07 07
    if (cleaned.startsWith('225') && cleaned.length === 13) {
      return `+225 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11)}`;
    }
    
    return phone; // Retourner tel quel si format non reconnu
  }
};

// Utilitaires pour la validation métier
export const businessValidations = {
  // Vérifier si une date est dans le futur
  isFutureDate: (date: Date): boolean => {
    return date > new Date();
  },

  // Vérifier si un devis est encore valide
  isQuoteValid: (validUntil: Date): boolean => {
    return new Date() <= validUntil;
  },

  // Vérifier si une facture est en retard
  isInvoiceOverdue: (dueDate: Date, status: string): boolean => {
    return new Date() > dueDate && !['PAID', 'CANCELLED'].includes(status);
  },

  // Vérifier si un employé peut prendre des congés
  canTakeLeave: (hireDate: Date, leaveStartDate: Date): boolean => {
    const monthsWorked = (leaveStartDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsWorked >= 1; // Au moins 1 mois de travail
  }
};

// Utilitaires pour les erreurs
export const errorHandlers = {
  // Créer une erreur standardisée
  createError: (message: string, statusCode: number = 400, details?: any) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  },

  // Gérer les erreurs Prisma
  handlePrismaError: (error: any) => {
    logger.error('Erreur Prisma:', error);

    switch (error.code) {
      case 'P2002':
        return errorHandlers.createError('Cette valeur existe déjà', 409, {
          field: error.meta?.target
        });
      case 'P2025':
        return errorHandlers.createError('Enregistrement non trouvé', 404);
      case 'P2003':
        return errorHandlers.createError('Violation de contrainte de clé étrangère', 400);
      case 'P2014':
        return errorHandlers.createError('Violation de contrainte de relation', 400);
      default:
        return errorHandlers.createError('Erreur de base de données', 500);
    }
  }
};

// Utilitaires pour les permissions
export const permissionHelpers = {
  // Vérifier si un utilisateur a une permission
  hasPermission: (userPermissions: string[], requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission);
  },

  // Vérifier si un utilisateur a un rôle
  hasRole: (userRole: string, allowedRoles: string[]): boolean => {
    return allowedRoles.includes(userRole);
  },

  // Vérifier l'accès à un service
  hasServiceAccess: (userServiceId: number | null, resourceServiceId: number | null, userRole: string): boolean => {
    // Admin et DG ont accès à tous les services
    if (['ADMIN', 'GENERAL_DIRECTOR'].includes(userRole)) {
      return true;
    }
    
    // Pour les autres, vérifier le service
    return userServiceId === resourceServiceId;
  }
};

// Utilitaires pour la pagination
export const paginationHelpers = {
  // Calculer l'offset pour la pagination
  calculateOffset: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },

  // Créer un objet de pagination
  createPaginationInfo: (page: number, limit: number, total: number) => {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  }
};

export default {
  generateNumber,
  calculations,
  formatters,
  businessValidations,
  errorHandlers,
  permissionHelpers,
  paginationHelpers
};