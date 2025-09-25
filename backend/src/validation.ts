import { body, param, query, ValidationChain } from 'express-validator';

/**
 * VALIDATIONS COMMUNES
 * Réutilisables dans plusieurs validateurs
 */
export const commonValidations = {
  /**
   * Validation d'ID numérique
   */
  id: param('id').isInt({ min: 1 }).withMessage('ID invalide'),

  /**
   * Validation d'email avec normalisation
   */
  email: body('email').isEmail().normalizeEmail().withMessage('Email invalide'),

  /**
   * Validation de mot de passe (min 6 caractères)
   */
  password: body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),

  /**
   * Validation de numéro de téléphone (optionnel)
   */
  phone: body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),

  /**
   * Validation de date ISO8601
   */
  date: (field: string) => body(field).isISO8601().toDate().withMessage(`${field} doit être une date valide`),

  /**
   * Validation de nombre positif
   */
  positiveNumber: (field: string) => body(field).isFloat({ min: 0 }).withMessage("${field} doit être un nombre positif"),

  /**
   * Validation de chaîne requise (avec trim)
   */
  requiredString: (field: string) => body(field).notEmpty().trim().withMessage("${field} est requis"),

  /**
   * Validation de pourcentage (0-100)
   */
  percentage: (field: string) => body(field).isFloat({ min: 0, max: 100 }).withMessage("${field} doit être un pourcentage entre 0 et 100"),

  /**
   * Validation de statut parmi une liste
   */
  status: (field: string, allowedStatuses: string[]) => 
    body(field).isIn(allowedStatuses).withMessage(`Statut invalide. Valeurs autorisées: ${allowedStatuses.join(', ')}`)
};

/**
 * VALIDATIONS UTILISATEURS
 */
export const userValidations = {
  create: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('role').isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER'])
      .withMessage('Rôle invalide'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  update: [
    commonValidations.id,
    commonValidations.email,
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('role').isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER'])
      .withMessage('Rôle invalide'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  updatePassword: [
    commonValidations.id,
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      return true;
    })
  ],

  login: [
    commonValidations.email,
    body('password').notEmpty().withMessage('Mot de passe requis')
  ]
};

/**
 * VALIDATIONS CLIENTS
 */
export const customerValidations = {
  create: [
    commonValidations.requiredString('name'),
    body('type').isIn(['INDIVIDUAL', 'COMPANY']).withMessage('Type de client invalide'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('paymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Délai de paiement invalide (0-365 jours)'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Limite de crédit invalide'),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide (0-100%)'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  update: [
    commonValidations.id,
    commonValidations.requiredString('name'),
    body('type').isIn(['INDIVIDUAL', 'COMPANY']).withMessage('Type de client invalide'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('paymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Délai de paiement invalide'),
    body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Limite de crédit invalide'),
    body('discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ]
};

/**
 * VALIDATIONS DEVIS
 */
export const quoteValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.date('quoteDate'),
    commonValidations.date('validUntil'),
    body('quoteType').optional().isIn(['DQE', 'REAL']).withMessage('Type de devis invalide'),
    body('dqeReference').optional().isString().withMessage('Référence DQE invalide'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.description').notEmpty().withMessage('Description requise'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
    body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('items.*.discountRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux de remise invalide'),
    body('terms').optional().isString().withMessage('Conditions invalides'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  update: [
    commonValidations.id,
    body('customerId').optional().isInt({ min: 1 }).withMessage('Client invalide'),
    commonValidations.date('quoteDate').optional(),
    commonValidations.date('validUntil').optional(),
    body('items').optional().isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('terms').optional().isString().withMessage('Conditions invalides'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  approval: [
    commonValidations.id,
    body('approvalLevel').isIn(['SERVICE_MANAGER', 'GENERAL_DIRECTOR']).withMessage('Niveau d\'approbation invalide'),
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Statut d\'approbation invalide'),
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ],

  submit: [
    commonValidations.id,
    body('approvalLevel').isIn(['SERVICE_MANAGER', 'GENERAL_DIRECTOR']).withMessage('Niveau de soumission invalide')
  ]
};

/**
 * VALIDATIONS FACTURES
 */
export const invoiceValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.date('invoiceDate'),
    commonValidations.date('dueDate'),
    body('type').optional().isIn(['INVOICE', 'CREDIT_NOTE', 'PROFORMA']).withMessage('Type de facture invalide'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.description').notEmpty().withMessage('Description requise'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
    body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('paymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Délai de paiement invalide'),
    body('terms').optional().isString().withMessage('Conditions invalides'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  updateStatus: [
    commonValidations.id,
    body('status').isIn(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).withMessage('Statut invalide')
  ],

  allocatePayment: [
    commonValidations.id,
    body('paymentId').isInt({ min: 1 }).withMessage('Paiement requis'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant allocation invalide')
  ]
};

/**
 * VALIDATIONS PAIEMENTS
 */
export const paymentValidations = {
  create: [
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    commonValidations.positiveNumber('amount'),
    commonValidations.date('paymentDate'),
    body('paymentMethod').isIn(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).withMessage('Mode de paiement invalide'),
    body('reference').optional().isString().withMessage('Référence invalide'),
    body('notes').optional().isString().withMessage('Notes invalides'),
    body('invoiceAllocations').optional().isArray().withMessage('Allocations invalides'),
    body('invoiceAllocations.*.invoiceId').optional().isInt({ min: 1 }).withMessage('ID facture invalide'),
    body('invoiceAllocations.*.amount').optional().isFloat({ min: 0.01 }).withMessage('Montant allocation invalide')
  ],

  allocate: [
    commonValidations.id,
    body('invoiceId').isInt({ min: 1 }).withMessage('Facture requise'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant allocation invalide')
  ]
};

/**
 * VALIDATIONS PRODUITS
 */
export const productValidations = {
  create: [
    body('sku').notEmpty().trim().withMessage('SKU requis'),
    commonValidations.requiredString('name'),
    body('type').isIn(['PRODUCT', 'SERVICE', 'SUBSCRIPTION']).withMessage('Type invalide'),
    commonValidations.positiveNumber('priceHt'),
    body('vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Quantité en stock invalide'),
    body('stockAlertThreshold').optional().isInt({ min: 0 }).withMessage('Seuil d\'alerte invalide'),
    body('category').optional().isString().withMessage('Catégorie invalide'),
    body('unit').optional().isString().withMessage('Unité invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  update: [
    commonValidations.id,
    body('sku').optional().notEmpty().trim().withMessage('SKU requis'),
    commonValidations.requiredString('name').optional(),
    body('type').optional().isIn(['PRODUCT', 'SERVICE', 'SUBSCRIPTION']).withMessage('Type invalide'),
    commonValidations.positiveNumber('priceHt').optional(),
    body('vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Quantité en stock invalide'),
    body('stockAlertThreshold').optional().isInt({ min: 0 }).withMessage('Seuil d\'alerte invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  updateStock: [
    commonValidations.id,
    body('quantity').isInt().withMessage('Quantité invalide'),
    body('operation').isIn(['INCREMENT', 'DECREMENT', 'SET']).withMessage('Opération invalide'),
    body('reason').optional().isString().withMessage('Raison invalide')
  ]
};

/**
 * VALIDATIONS EMPLOYÉS
 */
export const employeeValidations = {
  create: [
    commonValidations.requiredString('firstName'),
    commonValidations.requiredString('lastName'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    commonValidations.date('dateOfBirth'),
    commonValidations.date('hireDate'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    commonValidations.requiredString('position'),
    body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('nationality').optional().isString().withMessage('Nationalité invalide'),
    body('bankAccount').optional().isString().withMessage('Compte bancaire invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  update: [
    commonValidations.id,
    commonValidations.requiredString('firstName').optional(),
    commonValidations.requiredString('lastName').optional(),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    commonValidations.date('dateOfBirth').optional(),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    commonValidations.requiredString('position').optional(),
    body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ]
};

/**
 * VALIDATIONS CONTRATS
 */
export const contractValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    body('contractType').isIn(['CDI', 'CDD', 'STAGE', 'FREELANCE']).withMessage('Type de contrat invalide'),
    commonValidations.date('startDate'),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    commonValidations.positiveNumber('baseSalary'),
    body('workingHours').isFloat({ min: 0, max: 80 }).withMessage('Heures de travail invalides'),
    body('benefits').optional().isString().withMessage('Avantages invalides'),
    body('terms').optional().isString().withMessage('Conditions invalides'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ],

  update: [
    commonValidations.id,
    body('contractType').optional().isIn(['CDI', 'CDD', 'STAGE', 'FREELANCE']).withMessage('Type de contrat invalide'),
    commonValidations.date('startDate').optional(),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    commonValidations.positiveNumber('baseSalary').optional(),
    body('workingHours').optional().isFloat({ min: 0, max: 80 }).withMessage('Heures de travail invalides'),
    body('isActive').optional().isBoolean().withMessage('Statut actif invalide')
  ]
};

/**
 * VALIDATIONS SALAIRES
 */
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
    body('otherDeductions').optional().isFloat({ min: 0 }).withMessage('Autres déductions invalides'),
    body('paymentMethod').optional().isIn(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).withMessage('Mode de paiement invalide')
  ],

  update: [
    commonValidations.id,
    commonValidations.date('paymentDate').optional(),
    commonValidations.positiveNumber('baseSalary').optional(),
    body('overtime').optional().isFloat({ min: 0 }).withMessage('Heures supplémentaires invalides'),
    body('status').optional().isIn(['PENDING', 'PAID']).withMessage('Statut invalide')
  ]
};

/**
 * VALIDATIONS CONGÉS
 */
export const leaveValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    body('leaveType').isIn(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']).withMessage('Type de congé invalide'),
    commonValidations.date('startDate'),
    commonValidations.date('endDate'),
    commonValidations.requiredString('reason'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  update: [
    commonValidations.id,
    body('leaveType').optional().isIn(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']).withMessage('Type de congé invalide'),
    commonValidations.date('startDate').optional(),
    commonValidations.date('endDate').optional(),
    commonValidations.requiredString('reason').optional(),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  approval: [
    commonValidations.id,
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Statut invalide'),
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ]
};

/**
 * VALIDATIONS PRÊTS
 */
export const loanValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    commonValidations.positiveNumber('amount'),
    commonValidations.positiveNumber('monthlyPayment'),
    body('interestRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Taux d\'intérêt invalide'),
    commonValidations.date('startDate'),
    commonValidations.date('endDate'),
    commonValidations.requiredString('purpose'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  payment: [
    commonValidations.id,
    commonValidations.positiveNumber('amount'),
    commonValidations.date('paymentDate'),
    body('salaryId').optional().isInt({ min: 1 }).withMessage('ID salaire invalide'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ]
};

/**
 * VALIDATIONS PROJETS CLIENTS (NOUVEAU)
 */
export const projectValidations = {
  create: [
    commonValidations.requiredString('name'),
    body('customerId').isInt({ min: 1 }).withMessage('Client requis'),
    body('serviceId').isInt({ min: 1 }).withMessage('Service requis'),
    commonValidations.date('startDate'),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    body('budget').optional().isFloat({ min: 0 }).withMessage('Budget invalide'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priorité invalide'),
    body('description').optional().isString().withMessage('Description invalide')
  ],

  task: [
    commonValidations.requiredString('title'),
    body('projectId').isInt({ min: 1 }).withMessage('Projet requis'),
    body('assignedTo').optional().isInt({ min: 1 }).withMessage('Assignation invalide'),
    body('startDate').optional().isISO8601().toDate().withMessage('Date de début invalide'),
    body('endDate').optional().isISO8601().toDate().withMessage('Date de fin invalide'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priorité invalide'),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progression invalide (0-100)'),
    body('description').optional().isString().withMessage('Description invalide')
  ],

  timeEntry: [
    body('taskId').isInt({ min: 1 }).withMessage('Tâche requise'),
    body('userId').isInt({ min: 1 }).withMessage('Utilisateur requis'),
    commonValidations.date('date'),
    body('hours').isFloat({ min: 0, max: 24 }).withMessage('Heures invalides (0-24)'),
    body('description').optional().isString().withMessage('Description invalide')
  ]
};

/**
 * VALIDATIONS ACHATS (NOUVEAU)
 */
export const purchaseValidations = {
  create: [
    body('supplierId').isInt({ min: 1 }).withMessage('Fournisseur requis'),
    body('serviceId').optional().isInt({ min: 1 }).withMessage('Service invalide'),
    commonValidations.date('orderDate'),
    body('expectedDate').optional().isISO8601().toDate().withMessage('Date de livraison attendue invalide'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.description').notEmpty().withMessage('Description requise'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
    body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide'),
    body('notes').optional().isString().withMessage('Notes invalides')
  ],

  approval: [
    commonValidations.id,
    body('status').isIn(['APPROVED', 'REJECTED']).withMessage('Statut invalide'),
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ],

  receipt: [
    commonValidations.id,
    body('receiptNumber').notEmpty().withMessage('Numéro de réception requis'),
    commonValidations.date('receiptDate'),
    body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
    body('items.*.purchaseOrderItemId').isInt({ min: 1 }).withMessage('Article de commande invalide'),
    body('items.*.quantityReceived').isFloat({ min: 0 }).withMessage('Quantité reçue invalide')
  ]
};

/**
 * VALIDATIONS ÉVALUATIONS RH (NOUVEAU)
 */
export const performanceReviewValidations = {
  create: [
    body('employeeId').isInt({ min: 1 }).withMessage('Employé requis'),
    body('reviewerId').isInt({ min: 1 }).withMessage('Évaluateur requis'),
    commonValidations.date('reviewDate'),
    commonValidations.date('periodStart'),
    commonValidations.date('periodEnd'),
    body('type').isIn(['ANNUAL', 'PROBATION', 'PROMOTION', 'PROJECT']).withMessage('Type d\'évaluation invalide'),
    body('criteria').optional().isArray().withMessage('Critères invalides'),
    body('criteria.*.criteria').notEmpty().withMessage('Nom du critère requis'),
    body('criteria.*.weight').optional().isFloat({ min: 0, max: 1 }).withMessage('Poids invalide (0-1)')
  ],

  update: [
    commonValidations.id,
    body('overallScore').optional().isFloat({ min: 0, max: 10 }).withMessage('Score global invalide (0-10)'),
    body('status').optional().isIn(['DRAFT', 'PENDING_REVIEW', 'COMPLETED', 'ACKNOWLEDGED']).withMessage('Statut invalide'),
    body('strengths').optional().isString().withMessage('Points forts invalides'),
    body('areasToImprove').optional().isString().withMessage('Axes d\'amélioration invalides')
  ]
};

/**
 * VALIDATIONS CALENDRIER (NOUVEAU)
 */
export const calendarValidations = {
  event: [
    commonValidations.requiredString('title'),
    body('calendarId').isInt({ min: 1 }).withMessage('Calendrier requis'),
    commonValidations.date('startTime'),
    commonValidations.date('endTime'),
    body('type').isIn(['MEETING', 'TASK', 'APPOINTMENT', 'REMINDER', 'OTHER']).withMessage('Type d\'événement invalide'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priorité invalide'),
    body('isAllDay').optional().isBoolean().withMessage('Journée entière invalide'),
    body('location').optional().isString().withMessage('Lieu invalide'),
    body('description').optional().isString().withMessage('Description invalide')
  ],

  timeOff: [
    body('calendarId').isInt({ min: 1 }).withMessage('Calendrier requis'),
    body('type').isIn(['VACATION', 'SICK_LEAVE', 'PERSONAL_DAY', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'BEREAVEMENT', 'OTHER'])
      .withMessage('Type de congé invalide'),
    commonValidations.date('startDate'),
    commonValidations.date('endDate'),
    commonValidations.requiredString('reason'),
    body('comments').optional().isString().withMessage('Commentaires invalides')
  ]
};

/**
 * VALIDATIONS TECHNICIENS (NOUVEAU)
 */
export const technicienValidations = {
  create: [
    commonValidations.requiredString('nom'),
    commonValidations.requiredString('prenom'),
    commonValidations.requiredString('contact'),
    body('specialiteId').isInt({ min: 1 }).withMessage('Spécialité requise'),
    body('utilisateurId').optional().isInt({ min: 1 }).withMessage('Utilisateur invalide'),
    body('status').optional().isIn(['AVAILABLE', 'ON_MISSION', 'ON_LEAVE', 'SICK', 'TRAINING']).withMessage('Statut invalide')
  ],

  updateStatus: [
    commonValidations.id,
    body('status').isIn(['AVAILABLE', 'ON_MISSION', 'ON_LEAVE', 'SICK', 'TRAINING']).withMessage('Statut invalide'),
    body('currentMissionId').optional().isString().withMessage('ID mission invalide')
  ]
};

/**
 * VALIDATIONS PROSPECTION (MISE À JOUR)
 */
export const prospectValidations = {
  create: [
    commonValidations.requiredString('companyName'),
    commonValidations.requiredString('contactName'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('phone').optional().isMobilePhone('any').withMessage('Numéro de téléphone invalide'),
    body('industry').optional().isString().withMessage('Secteur invalide'),
    body('priority').optional().isIn(['A', 'B', 'C']).withMessage('Priorité invalide'),
    body('stage').optional().isIn(['preparation', 'research', 'contact', 'discovery', 'proposal', 'won', 'lost'])
      .withMessage('Étape invalide'),
    body('source').optional().isString().withMessage('Source invalide'),
    body('sourceDetail').optional().isString().withMessage('Détail de la source invalide'),
    body('sourceAuthor').optional().isString().withMessage('Auteur de la source invalide'),
    body('assignedTo').optional().isInt({ min: 1 }).withMessage('Assignation invalide')
  ],

  activity: [
    body('prospectId').isInt({ min: 1 }).withMessage('Prospect requis'),
    body('type').isIn(['call', 'email', 'meeting', 'note']).withMessage('Type d\'activité invalide'),
    commonValidations.requiredString('subject'),
    body('scheduledAt').optional().isISO8601().toDate().withMessage('Date planifiée invalide'),
    body('outcome').optional().isString().withMessage('Résultat invalide'),
    body('nextAction').optional().isString().withMessage('Prochaine action invalide')
  ]
};

/**
 * VALIDATIONS PARAMÈTRES DE REQUÊTE
 * Pour la pagination, recherche, etc.
 */
export const queryValidations = {
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide (1-100)')
  ],

  search: [
    query('search').optional().isString().trim().isLength({ min: 2 }).withMessage('Terme de recherche invalide (min 2 caractères)')
  ],

  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Date de début invalide'),
    query('endDate').optional().isISO8601().withMessage('Date de fin invalide'),
    query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Année invalide')
  ],

  status: [
    query('status').optional().isString().withMessage('Statut invalide')
  ],

  sort: [
    query('sortBy').optional().isString().withMessage('Champ de tri invalide'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordre de tri invalide')
  ]
};

/**
 * EXPORT PAR DÉFAUT
 * Regroupe toutes les validations pour une importation facile
 */
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
  loanValidations,
  projectValidations,
  purchaseValidations,
  performanceReviewValidations,
  calendarValidations,
  technicienValidations,
  prospectValidations,
  queryValidations
};