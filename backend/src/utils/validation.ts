import { body, param, query, ValidationChain } from 'express-validator';

// Validations communes
export const commonValidations = {
  id: param('id').isInt({ min: 1 }).withMessage('ID invalide'),
  email: body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  password: body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  phone: body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
  date: (field: string) => body(field).isISO8601().toDate().withMessage(`${field} doit être une date valide`),
  positiveNumber: (field: string) => body(field).isFloat({ min: 0 }).withMessage(`${field} doit être un nombre positif`),
  requiredString: (field: string) => body(field).notEmpty().trim().withMessage(`${field} est requis`)
};

// Validations pour les utilisateurs
export const userValidations = {
  create: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('role').isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT']).withMessage('Rôle invalide'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide')
  ],
  update: [
    commonValidations.id,
    commonValidations.email,
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('role').isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT']).withMessage('Rôle invalide'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide')
  ],
  updatePassword: [
    commonValidations.id,
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
  ]
};

// Validations pour les clients
export const customerValidations = {
  create: [
    commonValidations.requiredString('name'),
    body('type').isIn(['INDIVIDUAL', 'COMPANY']).withMessage('Type de client invalide'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('paymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Délai de paiement invalide'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Limite de crédit invalide'),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide')
  ],
  update: [
    commonValidations.id,
    commonValidations.requiredString('name'),
    body('type').isIn(['INDIVIDUAL', 'COMPANY']).withMessage('Type de client invalide'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('paymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Délai de paiement invalide'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Limite de crédit invalide'),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide')
  ]
};

// Validations pour les devis
export const quoteValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.date('quoteDate'),
    commonValidations.date('validUntil'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.description').notEmpty().withMessage('Description requise'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
    body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide')
  ],
  approval: [
    commonValidations.id,
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ]
};

// Validations pour les factures
export const invoiceValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.date('invoiceDate'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.description').notEmpty().withMessage('Description requise'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
    body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide')
  ],
  updateStatus: [
    commonValidations.id,
    body('status').isIn(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).withMessage('Statut invalide')
  ]
};

// Validations pour les paiements
export const paymentValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.positiveNumber('amount'),
    commonValidations.date('paymentDate'),
    body('paymentMethod').isIn(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).withMessage('Mode de paiement invalide'),
    body('invoiceAllocations').optional().isArray().withMessage('Allocations invalides'),
    body('invoiceAllocations.*.invoiceId').optional().isInt({ min: 1 }).withMessage('ID facture invalide'),
    body('invoiceAllocations.*.amount').optional().isFloat({ min: 0.01 }).withMessage('Montant allocation invalide')
  ]
};

// Validations pour les produits
export const productValidations = {
  create: [
    body('sku').notEmpty().trim().withMessage('SKU requis'),
    commonValidations.requiredString('name'),
    body('type').isIn(['PRODUCT', 'SERVICE', 'SUBSCRIPTION']).withMessage('Type invalide'),
    commonValidations.positiveNumber('priceHt'),
    body('vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Quantité en stock invalide')
  ],
  update: [
    commonValidations.id,
    body('sku').notEmpty().trim().withMessage('SKU requis'),
    commonValidations.requiredString('name'),
    body('type').isIn(['PRODUCT', 'SERVICE', 'SUBSCRIPTION']).withMessage('Type invalide'),
    commonValidations.positiveNumber('priceHt'),
    body('vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Quantité en stock invalide')
  ]
};

// Validations pour les employés
export const employeeValidations = {
  create: [
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    commonValidations.date('dateOfBirth'),
    commonValidations.date('hireDate'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    commonValidations.requiredString('position')
  ],
  update: [
    commonValidations.id,
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    commonValidations.date('dateOfBirth'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    commonValidations.requiredString('position')
  ]
};

// Validations pour les contrats
export const contractValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    body('contractType').isIn(['CDI', 'CDD', 'STAGE', 'FREELANCE']).withMessage('Type de contrat invalide'),
    commonValidations.date('startDate'),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    commonValidations.positiveNumber('baseSalary'),
    body('workingHours').isFloat({ min: 0, max: 80 }).withMessage('Heures de travail invalides')
  ],
  update: [
    commonValidations.id,
    body('contractType').isIn(['CDI', 'CDD', 'STAGE', 'FREELANCE']).withMessage('Type de contrat invalide'),
    commonValidations.date('startDate'),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    commonValidations.positiveNumber('baseSalary'),
    body('workingHours').isFloat({ min: 0, max: 80 }).withMessage('Heures de travail invalides')
  ]
};

// Validations pour les salaires
export const salaryValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    commonValidations.date('paymentDate'),
    commonValidations.positiveNumber('baseSalary'),
    body('overtime').optional().isFloat({ min: 0 }).withMessage('Heures supplémentaires invalides'),
    body('bonuses').optional().isFloat({ min: 0 }).withMessage('Primes invalides'),
    body('allowances').optional().isFloat({ min: 0 }).withMessage('Indemnités invalides'),
    body('socialContributions').optional().isFloat({ min: 0 }).withMessage('Cotisations sociales invalides'),
    body('taxes').optional().isFloat({ min: 0 }).withMessage('Impôts invalides'),
    body('otherDeductions').optional().isFloat({ min: 0 }).withMessage('Autres déductions invalides')
  ]
};

// Validations pour les congés
export const leaveValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    body('leaveType').isIn(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']).withMessage('Type de congé invalide'),
    commonValidations.date('startDate'),
    commonValidations.date('endDate'),
    commonValidations.requiredString('reason')
  ],
  approval: [
    commonValidations.id,
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ]
};

// Validations pour les paramètres de requête
export const queryValidations = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide')
  ],
  search: [
    query('search').optional().isString().trim().withMessage('Terme de recherche invalide')
  ],
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
    query('endDate').optional().isISO8601().withMessage('Date de fin invalide')
  ]
};

export default {
  commonValidations,
  userValidations,
  customerValidations,
  quoteValidations,
  invoiceValidations,
  paymentValidations,
  productValidations,
  employeeValidations,
  contractValidations,
  salaryValidations,
  leaveValidations,
  queryValidations
};