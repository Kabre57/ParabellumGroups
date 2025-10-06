// database/permissions.ts - VERSION CORRIGÉE
export const PERMISSIONS_LIST = {
  // Dashboard
  'dashboard.read': 'Accéder au tableau de bord',
  'dashboard.analytics': 'Voir les statistiques',
  'dashboard.reports': 'Générer des rapports',

  // Utilisateurs
  'users.create': 'Créer des utilisateurs',
  'users.read': 'Consulter les utilisateurs',
  'users.update': 'Modifier les utilisateurs',
  'users.delete': 'Supprimer des utilisateurs',
  'users.manage_permissions': 'Gérer les permissions',
  'users.reset_password': 'Réinitialiser les mots de passe',

  // Services
  'services.create': 'Créer des services',
  'services.read': 'Consulter les services',
  'services.update': 'Modifier les services',
  'services.delete': 'Supprimer des services',

  // Clients
  'customers.create': 'Créer des clients',
  'customers.read': 'Consulter les clients',
  'customers.update': 'Modifier les clients',
  'customers.delete': 'Supprimer des clients',
  'customers.contacts': 'Gérer les contacts clients',
  'customers.addresses': 'Gérer les adresses',

  // Devis
  'quotes.create': 'Créer des devis',
  'quotes.read': 'Consulter les devis',
  'quotes.update': 'Modifier les devis',
  'quotes.delete': 'Supprimer des devis',
  'quotes.submit_for_approval': 'Soumettre pour approbation',
  'quotes.approve_service': 'Approuver (Responsable Service)',
  'quotes.approve_dg': 'Approuver (Directeur Général)',
  'quotes.reject': 'Rejeter les devis',

  // Factures
  'invoices.create': 'Créer des factures',
  'invoices.read': 'Consulter les factures',
  'invoices.update': 'Modifier les factures',
  'invoices.delete': 'Supprimer des factures',
  'invoices.send': 'Envoyer les factures',

  // Paiements
  'payments.create': 'Enregistrer des paiements',
  'payments.read': 'Consulter les paiements',
  'payments.update': 'Modifier les paiements',
  'payments.delete': 'Supprimer des paiements',

  // Produits
  'products.create': 'Créer des produits',
  'products.read': 'Consulter les produits',
  'products.update': 'Modifier les produits',
  'products.delete': 'Supprimer des produits',

  // Dépenses
  'expenses.create': 'Créer des dépenses',
  'expenses.read': 'Consulter les dépenses',
  'expenses.update': 'Modifier les dépenses',
  'expenses.delete': 'Supprimer des dépenses',

  // Rapports
  'reports.financial': 'Consulter les rapports financiers',
  'reports.sales': 'Consulter les rapports de vente',
  'reports.audit': 'Consulter les logs d\'audit',

  // Administration
  'admin.system_settings': 'Gérer les paramètres système',
  'admin.backup': 'Gérer les sauvegardes',
  'admin.logs': 'Consulter les logs système',

  // Employés
  'employees.create': 'Créer des employés',
  'employees.read': 'Consulter les employés',
  'employees.update': 'Modifier les employés',
  'employees.delete': 'Supprimer des employés',

  // Contrats
  'contracts.create': 'Créer des contrats',
  'contracts.read': 'Consulter les contrats',
  'contracts.update': 'Modifier les contrats',
  'contracts.delete': 'Supprimer des contrats',

  // Salaires
  'salaries.create': 'Créer des salaires',
  'salaries.read': 'Consulter les salaires',
  'salaries.update': 'Modifier les salaires',
  'salaries.delete': 'Supprimer des salaires',

  // Congés
  'leaves.create': 'Créer des demandes de congé',
  'leaves.read': 'Consulter les demandes de congé',
  'leaves.update': 'Modifier les demandes de congé',
  'leaves.delete': 'Supprimer les demandes de congé',
  'leaves.approve': 'Approuver les demandes de congé',
  'leaves.reject': 'Rejeter les demandes de congé',

  // Prêts
  'loans.create': 'Créer des prêts',
  'loans.read': 'Consulter les prêts',
  'loans.update': 'Modifier les prêts',
  'loans.delete': 'Supprimer des prêts',

  // Services Techniques
  'specialites.create': 'Créer des spécialités',
  'specialites.read': 'Consulter les spécialités',
  'specialites.update': 'Modifier les spécialités',
  'specialites.delete': 'Supprimer des spécialités',

  'techniciens.create': 'Créer des techniciens',
  'techniciens.read': 'Consulter les techniciens',
  'techniciens.update': 'Modifier les techniciens',
  'techniciens.delete': 'Supprimer des techniciens',

  'missions.create': 'Créer des missions',
  'missions.read': 'Consulter les missions',
  'missions.update': 'Modifier les missions',
  'missions.delete': 'Supprimer des missions',

  'interventions.create': 'Créer des interventions',
  'interventions.read': 'Consulter les interventions',
  'interventions.update': 'Modifier les interventions',
  'interventions.delete': 'Supprimer des interventions',
  'interventions.schedule': 'Planifier les interventions (assignation / programmation)',

  'materiels.create': 'Créer du matériel',
  'materiels.read': 'Consulter le matériel',
  'materiels.update': 'Modifier le matériel',
  'materiels.delete': 'Supprimer le matériel',

  'rapports.create': 'Créer des rapports de mission',
  'rapports.read': 'Consulter les rapports de mission',
  'rapports.update': 'Modifier les rapports de mission',
  'rapports.validate': 'Valider les rapports de mission',

  // Messages
  'messages.create': 'Créer des messages',
  'messages.read': 'Consulter les messages',
  'messages.update': 'Modifier les messages',
  'messages.delete': 'Supprimer des messages',

  // Prospection
  'prospects.create': 'Créer des prospections',
  'prospects.read': 'Consulter les prospections',
  'prospects.update': 'Modifier les prospections',
  'prospects.delete': 'Supprimer les prospections',
  'prospects.assign': 'Assigner les prospections',
  'prospects.validate': 'Valider les prospections',

  // Pipeline CRM
  'crm.pipeline.read': 'Consulter le pipeline CRM',
  'crm.pipeline.update': 'Modifier le pipeline CRM',
  'crm.opportunities.create': 'Créer des opportunités',

  // Gestion de projets
  'projects.create': 'Créer des projets',
  'projects.read': 'Consulter les projets',
  'projects.update': 'Modifier les projets',
  'projects.delete': 'Supprimer des projets',

  // Service achat
  'purchases.create': 'Créer des commandes',
  'purchases.read': 'Consulter les commandes',
  'purchases.update': 'Modifier les commandes',
  'purchases.delete': 'Supprimer des commandes',

  'suppliers.create': 'Créer des fournisseurs',
  'suppliers.read': 'Consulter les fournisseurs',
  'suppliers.update': 'Modifier les fournisseurs',
  'suppliers.delete': 'Supprimer des fournisseurs',

  // Performance
  'performance.create': 'Créer des évaluations',
  'performance.read': 'Consulter les performances',
  'performance.update': 'Modifier les évaluations',
  'performance.delete': 'Supprimer des évaluations',

  // Planning
  'calendar.create': 'Créer des événements',
  'calendar.read': 'Consulter le planning',
  'calendar.update': 'Modifier le planning',
  'calendar.delete': 'Supprimer des événements',
  'calendar.manage': 'Gérer la configuration du calendrier',

  // Facturation récurrente
  'recurring.create': 'Créer des factures récurrentes',
  'recurring.read': 'Consulter les factures récurrentes',
  'recurring.update': 'Modifier les factures récurrentes',
  'recurring.delete': 'Supprimer les factures récurrentes',

  // Relances
  'reminders.create': 'Créer des relances',
  'reminders.read': 'Consulter les relances',
  'reminders.update': 'Modifier les relances',
  'reminders.delete': 'Supprimer des relances',

  // Comptabilité
  'comptes.create': 'Créer des comptes',
  'comptes.read': 'Consulter les comptes',
  'comptes.update': 'Modifier les comptes',
  'comptes.delete': 'Supprimer des comptes',

  'ecritures.create': 'Créer des écritures comptables',
  'ecritures.read': 'Consulter les écritures comptables',
  'ecritures.update': 'Modifier les écritures comptables',
  'ecritures.delete': 'Supprimer des écritures comptables',

  'tresorerie.create': 'Créer des flux de trésorerie',
  'tresorerie.read': 'Consulter la trésorerie',
  'tresorerie.update': 'Modifier les flux de trésorerie',
  'tresorerie.delete': 'Supprimer des flux de trésorerie'

} as const;

// Permissions par rôle - CORRECTION DU PROBLÈME TYPESCRIPT
export const ROLE_PERMISSIONS: { [key: string]: string[] } = {
  ADMIN: Object.keys(PERMISSIONS_LIST) as string[],
  
  GENERAL_DIRECTOR: [
    'dashboard.read', 'dashboard.analytics', 'dashboard.reports',
    'users.read', 'customers.read', 'quotes.read', 'quotes.approve_dg', 'quotes.reject',
    'invoices.read', 'payments.read', 'products.read', 'expenses.read',
    'reports.financial', 'reports.sales', 'reports.audit',
    'employees.read', 'contracts.read', 'salaries.read',
    'leaves.read', 'leaves.approve', 'leaves.reject',
    'loans.read', 'admin.system_settings', 'admin.logs',
    'comptes.read', 'ecritures.read', 'tresorerie.read'
  ],
  
  SERVICE_MANAGER: [
    'dashboard.read', 'dashboard.analytics',
    'users.read', 'customers.create', 'customers.read', 'customers.update',
    'quotes.create', 'quotes.read', 'quotes.update', 'quotes.approve_service', 'quotes.reject',
    'invoices.read', 'payments.read', 'products.read', 'expenses.read',
    'reports.sales', 
    'employees.create', 'employees.read', 'employees.update',
    'contracts.create', 'contracts.read', 'contracts.update',
    'leaves.read', 'leaves.approve', 'leaves.reject',
    'loans.create', 'loans.read', 'loans.update',
    'specialites.create', 'specialites.read', 'specialites.update',
    'techniciens.create', 'techniciens.read', 'techniciens.update',
    'missions.create', 'missions.read', 'missions.update',
    'interventions.create', 'interventions.read', 'interventions.update',
    'materiels.create', 'materiels.read', 'materiels.update',
    'rapports.read', 'rapports.validate',
    'messages.create', 'messages.read', 'messages.update',
    'prospects.create', 'prospects.read', 'prospects.update', 'prospects.assign',
    'performance.create', 'performance.read', 'performance.update',
    'calendar.create', 'calendar.read', 'calendar.update'
  ],
  
  EMPLOYEE: [
    'dashboard.read',
    'customers.create', 'customers.read', 'customers.update',
    'quotes.create', 'quotes.read', 'quotes.update', 'quotes.submit_for_approval',
    'products.read', 
    'leaves.create', 'leaves.read',
    'loans.read',
    'techniciens.read', 'missions.read', 'interventions.read', 'materiels.read',
    'rapports.create', 'rapports.read',
    'messages.create', 'messages.read',
    'prospects.create', 'prospects.read', 'prospects.update',
    'calendar.read'
  ],
  
  ACCOUNTANT: [
    'dashboard.read',
    'customers.read', 'quotes.read', 
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send', 
    'payments.create', 'payments.read', 'payments.update', 
    'expenses.create', 'expenses.read', 'expenses.update',
    'reports.financial', 
    'salaries.create', 'salaries.read', 'salaries.update',
    'loans.create', 'loans.read', 'loans.update',
    'messages.create', 'messages.read',
    'comptes.create', 'comptes.read', 'comptes.update',
    'ecritures.create', 'ecritures.read', 'ecritures.update',
    'tresorerie.create', 'tresorerie.read', 'tresorerie.update'
  ],
  
  COMMERCIAL: [
    'dashboard.read',
    'prospects.create', 'prospects.read', 'prospects.update', 'prospects.assign',
    'customers.create', 'customers.read', 'customers.update',
    'quotes.create', 'quotes.read', 'quotes.update', 'quotes.submit_for_approval',
    'products.read',
    'leaves.create', 'leaves.read',
    'messages.create', 'messages.read',
    'crm.pipeline.read', 'crm.opportunities.create',
    'calendar.create', 'calendar.read', 'calendar.update'
  ],

  PURCHASING_MANAGER: [
    'dashboard.read',
    'purchases.create', 'purchases.read', 'purchases.update', 'purchases.delete',
    'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
    'products.read', 'products.create', 'products.update',
    'messages.create', 'messages.read',
    'calendar.read'
  ]

};

// Fonction utilitaire pour vérifier les permissions
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

// Fonction pour obtenir les permissions d'un rôle - CORRECTION DU PROBLÈME TYPESCRIPT
export const getRolePermissions = (role: keyof typeof ROLE_PERMISSIONS): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Fonction pour valider une permission
export const isValidPermission = (permission: string): boolean => {
  return Object.keys(PERMISSIONS_LIST).includes(permission);
};

// Types TypeScript pour une meilleure sécurité
export type Permission = keyof typeof PERMISSIONS_LIST;
export type UserRole = keyof typeof ROLE_PERMISSIONS;