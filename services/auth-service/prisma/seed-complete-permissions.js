const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script d'initialisation COMPLÈTE de toutes les permissions du système
 * 
 * Couvre l'ensemble des modules de l'ERP Parabellum:
 * - Dashboard & Analytics
 * - Gestion Utilisateurs & Authentification
 * - Commercial & Prospection
 * - CRM Clients
 * - Facturation & Paiements
 * - Ressources Humaines
 * - Services Techniques
 * - Gestion de Projets
 * - Approvisionnement & Achats
 * - Inventaire & Stock
 * - Communication
 * - Administration Système
 */

const completePermissions = {
  // ═══════════════════════════════════════════════════════════
  // 📊 DASHBOARD & ANALYTICS
  // ═══════════════════════════════════════════════════════════
  dashboard: {
    label: 'Tableau de Bord',
    permissions: [
      { name: 'dashboard.view', description: 'Accéder au tableau de bord principal' },
      { name: 'dashboard.view_analytics', description: 'Voir les statistiques et KPIs' },
      { name: 'dashboard.view_widgets', description: 'Voir les widgets personnalisés' },
      { name: 'dashboard.manage_widgets', description: 'Gérer les widgets du dashboard' },
      { name: 'dashboard.export', description: 'Exporter les données du dashboard' }
    ]
  },

  analytics: {
    label: 'Analytique & Rapports',
    permissions: [
      { name: 'analytics.view', description: 'Consulter les analyses' },
      { name: 'analytics.view_financial', description: 'Voir les analyses financières' },
      { name: 'analytics.view_sales', description: 'Voir les analyses commerciales' },
      { name: 'analytics.view_hr', description: 'Voir les analyses RH' },
      { name: 'analytics.view_operations', description: 'Voir les analyses opérationnelles' },
      { name: 'analytics.view_technical', description: 'Voir les analyses techniques' },
      { name: 'analytics.create_report', description: 'Créer des rapports personnalisés' },
      { name: 'analytics.export', description: 'Exporter les rapports' },
      { name: 'analytics.schedule', description: 'Programmer des rapports automatiques' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 👥 GESTION UTILISATEURS & AUTHENTIFICATION
  // ═══════════════════════════════════════════════════════════
  users: {
    label: 'Utilisateurs',
    permissions: [
      { name: 'users.view', description: 'Consulter les utilisateurs' },
      { name: 'users.view_all', description: 'Voir tous les utilisateurs' },
      { name: 'users.view_own', description: 'Voir son propre profil uniquement' },
      { name: 'users.create', description: 'Créer des utilisateurs' },
      { name: 'users.update', description: 'Modifier les utilisateurs' },
      { name: 'users.update_own', description: 'Modifier son propre profil' },
      { name: 'users.delete', description: 'Supprimer des utilisateurs' },
      { name: 'users.activate', description: 'Activer/Désactiver des utilisateurs' },
      { name: 'users.reset_password', description: 'Réinitialiser les mots de passe' },
      { name: 'users.manage_roles', description: 'Assigner des rôles' },
      { name: 'users.manage_permissions', description: 'Gérer les permissions individuelles' },
      { name: 'users.impersonate', description: 'Se connecter en tant qu\'autre utilisateur' },
      { name: 'users.export', description: 'Exporter la liste des utilisateurs' }
    ]
  },

  roles: {
    label: 'Rôles',
    permissions: [
      { name: 'roles.view', description: 'Consulter les rôles' },
      { name: 'roles.create', description: 'Créer des rôles' },
      { name: 'roles.update', description: 'Modifier les rôles' },
      { name: 'roles.delete', description: 'Supprimer des rôles' },
      { name: 'roles.manage_permissions', description: 'Gérer les permissions des rôles' }
    ]
  },

  permissions: {
    label: 'Permissions',
    permissions: [
      { name: 'permissions.view', description: 'Consulter les permissions' },
      { name: 'permissions.create', description: 'Créer des permissions' },
      { name: 'permissions.update', description: 'Modifier les permissions' },
      { name: 'permissions.delete', description: 'Supprimer des permissions' }
    ]
  },

  services: {
    label: 'Services/Départements',
    permissions: [
      { name: 'services.view', description: 'Consulter les services' },
      { name: 'services.view_all', description: 'Voir tous les services' },
      { name: 'services.view_own', description: 'Voir uniquement son service' },
      { name: 'services.create', description: 'Créer des services' },
      { name: 'services.update', description: 'Modifier les services' },
      { name: 'services.delete', description: 'Supprimer des services' },
      { name: 'services.manage_hierarchy', description: 'Gérer la hiérarchie des services' },
      { name: 'services.assign_manager', description: 'Assigner des responsables' }
    ]
  },

  audit_logs: {
    label: 'Journaux d\'Audit',
    permissions: [
      { name: 'audit_logs.view', description: 'Consulter les journaux d\'audit' },
      { name: 'audit_logs.view_info', description: 'Voir les logs niveau INFO' },
      { name: 'audit_logs.view_warning', description: 'Voir les logs niveau WARNING' },
      { name: 'audit_logs.view_error', description: 'Voir les logs niveau ERROR' },
      { name: 'audit_logs.view_critical', description: 'Voir les logs niveau CRITICAL' },
      { name: 'audit_logs.view_security', description: 'Voir les logs de sécurité' },
      { name: 'audit_logs.export', description: 'Exporter les logs' },
      { name: 'audit_logs.delete', description: 'Supprimer des logs (dangereux)' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 💼 COMMERCIAL & PROSPECTION
  // ═══════════════════════════════════════════════════════════
  prospects: {
    label: 'Prospects',
    permissions: [
      { name: 'prospects.view', description: 'Consulter les prospects' },
      { name: 'prospects.view_all', description: 'Voir tous les prospects' },
      { name: 'prospects.view_own', description: 'Voir uniquement ses prospects' },
      { name: 'prospects.create', description: 'Créer des prospects' },
      { name: 'prospects.update', description: 'Modifier les prospects' },
      { name: 'prospects.delete', description: 'Supprimer des prospects' },
      { name: 'prospects.assign', description: 'Assigner des prospects à un commercial' },
      { name: 'prospects.convert', description: 'Convertir un prospect en client' },
      { name: 'prospects.manage_activities', description: 'Gérer les activités de prospection' },
      { name: 'prospects.export', description: 'Exporter les prospects' },
      { name: 'prospects.import', description: 'Importer des prospects' }
    ]
  },

  opportunities: {
    label: 'Opportunités Commerciales',
    permissions: [
      { name: 'opportunities.view', description: 'Consulter les opportunités' },
      { name: 'opportunities.view_all', description: 'Voir toutes les opportunités' },
      { name: 'opportunities.view_own', description: 'Voir uniquement ses opportunités' },
      { name: 'opportunities.create', description: 'Créer des opportunités' },
      { name: 'opportunities.update', description: 'Modifier les opportunités' },
      { name: 'opportunities.delete', description: 'Supprimer des opportunités' },
      { name: 'opportunities.assign', description: 'Assigner des opportunités' },
      { name: 'opportunities.change_stage', description: 'Changer le stade d\'opportunité' },
      { name: 'opportunities.export', description: 'Exporter les opportunités' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 🏢 CRM CLIENTS
  // ═══════════════════════════════════════════════════════════
  customers: {
    label: 'Clients',
    permissions: [
      { name: 'customers.view', description: 'Consulter les clients' },
      { name: 'customers.view_all', description: 'Voir tous les clients' },
      { name: 'customers.view_assigned', description: 'Voir uniquement les clients assignés' },
      { name: 'customers.create', description: 'Créer des clients' },
      { name: 'customers.update', description: 'Modifier les clients' },
      { name: 'customers.delete', description: 'Supprimer des clients' },
      { name: 'customers.manage_contacts', description: 'Gérer les contacts clients' },
      { name: 'customers.manage_addresses', description: 'Gérer les adresses clients' },
      { name: 'customers.manage_documents', description: 'Gérer les documents clients' },
      { name: 'customers.view_financial', description: 'Voir les infos financières clients' },
      { name: 'customers.export', description: 'Exporter les clients' },
      { name: 'customers.import', description: 'Importer des clients' }
    ]
  },

  contacts: {
    label: 'Contacts',
    permissions: [
      { name: 'contacts.view', description: 'Consulter les contacts' },
      { name: 'contacts.create', description: 'Créer des contacts' },
      { name: 'contacts.update', description: 'Modifier les contacts' },
      { name: 'contacts.delete', description: 'Supprimer des contacts' }
    ]
  },

  interactions: {
    label: 'Interactions Clients',
    permissions: [
      { name: 'interactions.view', description: 'Consulter les interactions' },
      { name: 'interactions.view_all', description: 'Voir toutes les interactions' },
      { name: 'interactions.view_own', description: 'Voir uniquement ses interactions' },
      { name: 'interactions.create', description: 'Créer des interactions' },
      { name: 'interactions.update', description: 'Modifier les interactions' },
      { name: 'interactions.delete', description: 'Supprimer des interactions' }
    ]
  },

  contracts: {
    label: 'Contrats Clients',
    permissions: [
      { name: 'contracts.view', description: 'Consulter les contrats' },
      { name: 'contracts.view_all', description: 'Voir tous les contrats' },
      { name: 'contracts.create', description: 'Créer des contrats' },
      { name: 'contracts.update', description: 'Modifier les contrats' },
      { name: 'contracts.delete', description: 'Supprimer des contrats' },
      { name: 'contracts.sign', description: 'Signer des contrats' },
      { name: 'contracts.approve', description: 'Approuver des contrats' },
      { name: 'contracts.renew', description: 'Renouveler des contrats' },
      { name: 'contracts.terminate', description: 'Résilier des contrats' },
      { name: 'contracts.export', description: 'Exporter les contrats' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 💰 FACTURATION & PAIEMENTS
  // ═══════════════════════════════════════════════════════════
  quotes: {
    label: 'Devis',
    permissions: [
      { name: 'quotes.view', description: 'Consulter les devis' },
      { name: 'quotes.view_all', description: 'Voir tous les devis' },
      { name: 'quotes.view_own', description: 'Voir uniquement ses devis' },
      { name: 'quotes.create', description: 'Créer des devis' },
      { name: 'quotes.update', description: 'Modifier les devis' },
      { name: 'quotes.delete', description: 'Supprimer des devis' },
      { name: 'quotes.send', description: 'Envoyer des devis aux clients' },
      { name: 'quotes.approve', description: 'Approuver des devis' },
      { name: 'quotes.convert', description: 'Convertir un devis en facture' },
      { name: 'quotes.duplicate', description: 'Dupliquer des devis' },
      { name: 'quotes.print', description: 'Imprimer des devis' },
      { name: 'quotes.export', description: 'Exporter les devis' }
    ]
  },

  invoices: {
    label: 'Factures',
    permissions: [
      { name: 'invoices.view', description: 'Consulter les factures' },
      { name: 'invoices.view_all', description: 'Voir toutes les factures' },
      { name: 'invoices.view_own', description: 'Voir uniquement ses factures' },
      { name: 'invoices.create', description: 'Créer des factures' },
      { name: 'invoices.update', description: 'Modifier les factures' },
      { name: 'invoices.delete', description: 'Supprimer des factures' },
      { name: 'invoices.send', description: 'Envoyer des factures' },
      { name: 'invoices.validate', description: 'Valider des factures' },
      { name: 'invoices.cancel', description: 'Annuler des factures' },
      { name: 'invoices.credit_note', description: 'Créer des avoirs' },
      { name: 'invoices.print', description: 'Imprimer des factures' },
      { name: 'invoices.export', description: 'Exporter les factures' }
    ]
  },

  payments: {
    label: 'Paiements',
    permissions: [
      { name: 'payments.view', description: 'Consulter les paiements' },
      { name: 'payments.view_all', description: 'Voir tous les paiements' },
      { name: 'payments.create', description: 'Enregistrer des paiements' },
      { name: 'payments.update', description: 'Modifier les paiements' },
      { name: 'payments.delete', description: 'Supprimer des paiements' },
      { name: 'payments.validate', description: 'Valider des paiements' },
      { name: 'payments.refund', description: 'Créer des remboursements' },
      { name: 'payments.export', description: 'Exporter les paiements' }
    ]
  },

  products: {
    label: 'Produits & Services',
    permissions: [
      { name: 'products.view', description: 'Consulter le catalogue produits' },
      { name: 'products.create', description: 'Créer des produits/services' },
      { name: 'products.update', description: 'Modifier les produits' },
      { name: 'products.delete', description: 'Supprimer des produits' },
      { name: 'products.manage_categories', description: 'Gérer les catégories' },
      { name: 'products.manage_pricing', description: 'Gérer les tarifs' },
      { name: 'products.export', description: 'Exporter le catalogue' },
      { name: 'products.import', description: 'Importer des produits' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 👔 RESSOURCES HUMAINES
  // ═══════════════════════════════════════════════════════════
  employees: {
    label: 'Employés',
    permissions: [
      { name: 'employees.view', description: 'Consulter les employés' },
      { name: 'employees.view_all', description: 'Voir tous les employés' },
      { name: 'employees.view_team', description: 'Voir uniquement son équipe' },
      { name: 'employees.view_own', description: 'Voir uniquement son dossier' },
      { name: 'employees.create', description: 'Créer des employés' },
      { name: 'employees.update', description: 'Modifier les employés' },
      { name: 'employees.update_own', description: 'Modifier son propre dossier' },
      { name: 'employees.delete', description: 'Supprimer des employés' },
      { name: 'employees.view_sensitive', description: 'Voir les données sensibles (salaire, etc.)' },
      { name: 'employees.manage_documents', description: 'Gérer les documents RH' },
      { name: 'employees.export', description: 'Exporter les employés' }
    ]
  },

  employee_contracts: {
    label: 'Contrats Employés',
    permissions: [
      { name: 'employee_contracts.view', description: 'Consulter les contrats' },
      { name: 'employee_contracts.view_all', description: 'Voir tous les contrats' },
      { name: 'employee_contracts.view_own', description: 'Voir uniquement son contrat' },
      { name: 'employee_contracts.create', description: 'Créer des contrats' },
      { name: 'employee_contracts.update', description: 'Modifier les contrats' },
      { name: 'employee_contracts.delete', description: 'Supprimer des contrats' },
      { name: 'employee_contracts.sign', description: 'Signer des contrats' },
      { name: 'employee_contracts.renew', description: 'Renouveler des contrats' },
      { name: 'employee_contracts.terminate', description: 'Résilier des contrats' }
    ]
  },

  payroll: {
    label: 'Paie',
    permissions: [
      { name: 'payroll.view', description: 'Consulter les fiches de paie' },
      { name: 'payroll.view_all', description: 'Voir toutes les paies' },
      { name: 'payroll.view_own', description: 'Voir uniquement sa paie' },
      { name: 'payroll.create', description: 'Créer des fiches de paie' },
      { name: 'payroll.update', description: 'Modifier les paies' },
      { name: 'payroll.delete', description: 'Supprimer des paies' },
      { name: 'payroll.validate', description: 'Valider les paies' },
      { name: 'payroll.export', description: 'Exporter les données de paie' },
      { name: 'payroll.process', description: 'Traiter les paies (calculs automatiques)' }
    ]
  },

  leaves: {
    label: 'Congés',
    permissions: [
      { name: 'leaves.view', description: 'Consulter les congés' },
      { name: 'leaves.view_all', description: 'Voir tous les congés' },
      { name: 'leaves.view_team', description: 'Voir les congés de son équipe' },
      { name: 'leaves.view_own', description: 'Voir uniquement ses congés' },
      { name: 'leaves.create', description: 'Créer des demandes de congés' },
      { name: 'leaves.update', description: 'Modifier les congés' },
      { name: 'leaves.delete', description: 'Supprimer des congés' },
      { name: 'leaves.approve', description: 'Approuver les demandes de congés' },
      { name: 'leaves.reject', description: 'Rejeter les demandes de congés' },
      { name: 'leaves.cancel', description: 'Annuler des congés' },
      { name: 'leaves.export', description: 'Exporter les congés' }
    ]
  },

  attendance: {
    label: 'Présences',
    permissions: [
      { name: 'attendance.view', description: 'Consulter les présences' },
      { name: 'attendance.view_all', description: 'Voir toutes les présences' },
      { name: 'attendance.view_team', description: 'Voir les présences de son équipe' },
      { name: 'attendance.view_own', description: 'Voir uniquement sa présence' },
      { name: 'attendance.create', description: 'Enregistrer des présences' },
      { name: 'attendance.update', description: 'Modifier les présences' },
      { name: 'attendance.delete', description: 'Supprimer des présences' },
      { name: 'attendance.validate', description: 'Valider les présences' },
      { name: 'attendance.export', description: 'Exporter les présences' }
    ]
  },

  evaluations: {
    label: 'Évaluations',
    permissions: [
      { name: 'evaluations.view', description: 'Consulter les évaluations' },
      { name: 'evaluations.view_all', description: 'Voir toutes les évaluations' },
      { name: 'evaluations.view_team', description: 'Voir les évaluations de son équipe' },
      { name: 'evaluations.view_own', description: 'Voir uniquement ses évaluations' },
      { name: 'evaluations.create', description: 'Créer des évaluations' },
      { name: 'evaluations.update', description: 'Modifier les évaluations' },
      { name: 'evaluations.delete', description: 'Supprimer des évaluations' },
      { name: 'evaluations.validate', description: 'Valider les évaluations' }
    ]
  },

  loans: {
    label: 'Prêts & Avances',
    permissions: [
      { name: 'loans.view', description: 'Consulter les prêts' },
      { name: 'loans.view_all', description: 'Voir tous les prêts' },
      { name: 'loans.view_own', description: 'Voir uniquement ses prêts' },
      { name: 'loans.create', description: 'Créer des demandes de prêt' },
      { name: 'loans.update', description: 'Modifier les prêts' },
      { name: 'loans.delete', description: 'Supprimer des prêts' },
      { name: 'loans.approve', description: 'Approuver les prêts' },
      { name: 'loans.reject', description: 'Rejeter les prêts' },
      { name: 'loans.manage_repayment', description: 'Gérer les remboursements' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 🔧 SERVICES TECHNIQUES
  // ═══════════════════════════════════════════════════════════
  techniciens: {
    label: 'Techniciens',
    permissions: [
      { name: 'techniciens.view', description: 'Consulter les techniciens' },
      { name: 'techniciens.create', description: 'Créer des techniciens' },
      { name: 'techniciens.update', description: 'Modifier les techniciens' },
      { name: 'techniciens.delete', description: 'Supprimer des techniciens' },
      { name: 'techniciens.manage_specialties', description: 'Gérer les spécialités' },
      { name: 'techniciens.view_performance', description: 'Voir les performances' }
    ]
  },

  specialites: {
    label: 'Spécialités Techniques',
    permissions: [
      { name: 'specialites.view', description: 'Consulter les spécialités' },
      { name: 'specialites.create', description: 'Créer des spécialités' },
      { name: 'specialites.update', description: 'Modifier les spécialités' },
      { name: 'specialites.delete', description: 'Supprimer des spécialités' }
    ]
  },

  missions: {
    label: 'Missions Techniques',
    permissions: [
      { name: 'missions.view', description: 'Consulter les missions' },
      { name: 'missions.view_all', description: 'Voir toutes les missions' },
      { name: 'missions.view_assigned', description: 'Voir uniquement ses missions' },
      { name: 'missions.create', description: 'Créer des missions' },
      { name: 'missions.update', description: 'Modifier les missions' },
      { name: 'missions.delete', description: 'Supprimer des missions' },
      { name: 'missions.assign', description: 'Assigner des missions' },
      { name: 'missions.change_status', description: 'Changer le statut des missions' },
      { name: 'missions.complete', description: 'Marquer une mission comme terminée' }
    ]
  },

  interventions: {
    label: 'Interventions',
    permissions: [
      { name: 'interventions.view', description: 'Consulter les interventions' },
      { name: 'interventions.view_all', description: 'Voir toutes les interventions' },
      { name: 'interventions.view_assigned', description: 'Voir uniquement ses interventions' },
      { name: 'interventions.create', description: 'Créer des interventions' },
      { name: 'interventions.update', description: 'Modifier les interventions' },
      { name: 'interventions.delete', description: 'Supprimer des interventions' },
      { name: 'interventions.assign_technician', description: 'Assigner des techniciens' },
      { name: 'interventions.assign_material', description: 'Assigner du matériel' },
      { name: 'interventions.complete', description: 'Compléter une intervention' },
      { name: 'interventions.create_report', description: 'Créer des rapports d\'intervention' }
    ]
  },

  rapports_techniques: {
    label: 'Rapports Techniques',
    permissions: [
      { name: 'rapports_techniques.view', description: 'Consulter les rapports techniques' },
      { name: 'rapports_techniques.view_all', description: 'Voir tous les rapports' },
      { name: 'rapports_techniques.view_own', description: 'Voir uniquement ses rapports' },
      { name: 'rapports_techniques.create', description: 'Créer des rapports' },
      { name: 'rapports_techniques.update', description: 'Modifier les rapports' },
      { name: 'rapports_techniques.delete', description: 'Supprimer des rapports' },
      { name: 'rapports_techniques.validate', description: 'Valider des rapports' },
      { name: 'rapports_techniques.export', description: 'Exporter les rapports' }
    ]
  },

  materiel: {
    label: 'Matériel Technique',
    permissions: [
      { name: 'materiel.view', description: 'Consulter le matériel' },
      { name: 'materiel.create', description: 'Ajouter du matériel' },
      { name: 'materiel.update', description: 'Modifier le matériel' },
      { name: 'materiel.delete', description: 'Supprimer du matériel' },
      { name: 'materiel.assign', description: 'Assigner du matériel' },
      { name: 'materiel.track_stock', description: 'Suivre les stocks' },
      { name: 'materiel.maintenance', description: 'Gérer la maintenance' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 📋 GESTION DE PROJETS
  // ═══════════════════════════════════════════════════════════
  projects: {
    label: 'Projets',
    permissions: [
      { name: 'projects.view', description: 'Consulter les projets' },
      { name: 'projects.view_all', description: 'Voir tous les projets' },
      { name: 'projects.view_assigned', description: 'Voir uniquement ses projets' },
      { name: 'projects.create', description: 'Créer des projets' },
      { name: 'projects.update', description: 'Modifier les projets' },
      { name: 'projects.delete', description: 'Supprimer des projets' },
      { name: 'projects.manage_team', description: 'Gérer l\'équipe projet' },
      { name: 'projects.manage_budget', description: 'Gérer le budget projet' },
      { name: 'projects.change_status', description: 'Changer le statut des projets' },
      { name: 'projects.archive', description: 'Archiver des projets' }
    ]
  },

  tasks: {
    label: 'Tâches Projet',
    permissions: [
      { name: 'tasks.view', description: 'Consulter les tâches' },
      { name: 'tasks.view_all', description: 'Voir toutes les tâches' },
      { name: 'tasks.view_assigned', description: 'Voir uniquement ses tâches' },
      { name: 'tasks.create', description: 'Créer des tâches' },
      { name: 'tasks.update', description: 'Modifier les tâches' },
      { name: 'tasks.delete', description: 'Supprimer des tâches' },
      { name: 'tasks.assign', description: 'Assigner des tâches' },
      { name: 'tasks.change_status', description: 'Changer le statut des tâches' },
      { name: 'tasks.comment', description: 'Commenter les tâches' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 🛒 APPROVISIONNEMENT & ACHATS
  // ═══════════════════════════════════════════════════════════
  suppliers: {
    label: 'Fournisseurs',
    permissions: [
      { name: 'suppliers.view', description: 'Consulter les fournisseurs' },
      { name: 'suppliers.create', description: 'Créer des fournisseurs' },
      { name: 'suppliers.update', description: 'Modifier les fournisseurs' },
      { name: 'suppliers.delete', description: 'Supprimer des fournisseurs' },
      { name: 'suppliers.evaluate', description: 'Évaluer les fournisseurs' },
      { name: 'suppliers.export', description: 'Exporter les fournisseurs' }
    ]
  },

  purchase_requests: {
    label: 'Demandes d\'Achat',
    permissions: [
      { name: 'purchase_requests.view', description: 'Consulter les demandes d\'achat' },
      { name: 'purchase_requests.view_all', description: 'Voir toutes les demandes' },
      { name: 'purchase_requests.view_own', description: 'Voir uniquement ses demandes' },
      { name: 'purchase_requests.create', description: 'Créer des demandes d\'achat' },
      { name: 'purchase_requests.update', description: 'Modifier les demandes' },
      { name: 'purchase_requests.delete', description: 'Supprimer des demandes' },
      { name: 'purchase_requests.approve', description: 'Approuver les demandes' },
      { name: 'purchase_requests.reject', description: 'Rejeter les demandes' }
    ]
  },

  purchase_orders: {
    label: 'Bons de Commande',
    permissions: [
      { name: 'purchase_orders.view', description: 'Consulter les bons de commande' },
      { name: 'purchase_orders.create', description: 'Créer des bons de commande' },
      { name: 'purchase_orders.update', description: 'Modifier les bons de commande' },
      { name: 'purchase_orders.delete', description: 'Supprimer des bons de commande' },
      { name: 'purchase_orders.send', description: 'Envoyer aux fournisseurs' },
      { name: 'purchase_orders.approve', description: 'Approuver les bons de commande' },
      { name: 'purchase_orders.receive', description: 'Enregistrer les réceptions' },
      { name: 'purchase_orders.cancel', description: 'Annuler des commandes' }
    ]
  },

  expenses: {
    label: 'Dépenses',
    permissions: [
      { name: 'expenses.view', description: 'Consulter les dépenses' },
      { name: 'expenses.view_all', description: 'Voir toutes les dépenses' },
      { name: 'expenses.view_own', description: 'Voir uniquement ses dépenses' },
      { name: 'expenses.create', description: 'Créer des dépenses' },
      { name: 'expenses.update', description: 'Modifier les dépenses' },
      { name: 'expenses.delete', description: 'Supprimer des dépenses' },
      { name: 'expenses.approve', description: 'Approuver les dépenses' },
      { name: 'expenses.reject', description: 'Rejeter les dépenses' },
      { name: 'expenses.reimburse', description: 'Rembourser les dépenses' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 📦 INVENTAIRE & STOCK
  // ═══════════════════════════════════════════════════════════
  inventory: {
    label: 'Inventaire',
    permissions: [
      { name: 'inventory.view', description: 'Consulter l\'inventaire' },
      { name: 'inventory.view_all', description: 'Voir tous les stocks' },
      { name: 'inventory.view_warehouse', description: 'Voir uniquement son entrepôt' },
      { name: 'inventory.create', description: 'Ajouter des articles' },
      { name: 'inventory.update', description: 'Modifier les articles' },
      { name: 'inventory.delete', description: 'Supprimer des articles' },
      { name: 'inventory.adjust', description: 'Ajuster les stocks' },
      { name: 'inventory.transfer', description: 'Transférer entre entrepôts' },
      { name: 'inventory.count', description: 'Effectuer des comptages' },
      { name: 'inventory.export', description: 'Exporter l\'inventaire' }
    ]
  },

  warehouses: {
    label: 'Entrepôts',
    permissions: [
      { name: 'warehouses.view', description: 'Consulter les entrepôts' },
      { name: 'warehouses.create', description: 'Créer des entrepôts' },
      { name: 'warehouses.update', description: 'Modifier les entrepôts' },
      { name: 'warehouses.delete', description: 'Supprimer des entrepôts' }
    ]
  },

  stock_movements: {
    label: 'Mouvements de Stock',
    permissions: [
      { name: 'stock_movements.view', description: 'Consulter les mouvements' },
      { name: 'stock_movements.create', description: 'Créer des mouvements (entrées/sorties)' },
      { name: 'stock_movements.update', description: 'Modifier les mouvements' },
      { name: 'stock_movements.delete', description: 'Supprimer des mouvements' },
      { name: 'stock_movements.validate', description: 'Valider les mouvements' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 💬 COMMUNICATION
  // ═══════════════════════════════════════════════════════════
  notifications: {
    label: 'Notifications',
    permissions: [
      { name: 'notifications.view', description: 'Consulter les notifications' },
      { name: 'notifications.view_own', description: 'Voir uniquement ses notifications' },
      { name: 'notifications.create', description: 'Créer des notifications' },
      { name: 'notifications.send', description: 'Envoyer des notifications' },
      { name: 'notifications.send_bulk', description: 'Envoyer en masse' },
      { name: 'notifications.delete', description: 'Supprimer des notifications' },
      { name: 'notifications.manage_settings', description: 'Gérer les préférences' }
    ]
  },

  messages: {
    label: 'Messages Internes',
    permissions: [
      { name: 'messages.view', description: 'Consulter les messages' },
      { name: 'messages.send', description: 'Envoyer des messages' },
      { name: 'messages.delete', description: 'Supprimer des messages' },
      { name: 'messages.broadcast', description: 'Diffuser à tous' }
    ]
  },

  emails: {
    label: 'Emails',
    permissions: [
      { name: 'emails.view', description: 'Consulter l\'historique d\'emails' },
      { name: 'emails.send', description: 'Envoyer des emails' },
      { name: 'emails.send_bulk', description: 'Envoi en masse' },
      { name: 'emails.manage_templates', description: 'Gérer les modèles d\'email' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // ⚙️ ADMINISTRATION SYSTÈME
  // ═══════════════════════════════════════════════════════════
  system_settings: {
    label: 'Paramètres Système',
    permissions: [
      { name: 'system_settings.view', description: 'Consulter les paramètres système' },
      { name: 'system_settings.update', description: 'Modifier les paramètres système' },
      { name: 'system_settings.update_general', description: 'Modifier paramètres généraux' },
      { name: 'system_settings.update_security', description: 'Modifier paramètres de sécurité' },
      { name: 'system_settings.update_email', description: 'Configurer les emails' },
      { name: 'system_settings.update_integrations', description: 'Gérer les intégrations' }
    ]
  },

  backups: {
    label: 'Sauvegardes',
    permissions: [
      { name: 'backups.view', description: 'Consulter les sauvegardes' },
      { name: 'backups.create', description: 'Créer des sauvegardes' },
      { name: 'backups.restore', description: 'Restaurer des sauvegardes' },
      { name: 'backups.delete', description: 'Supprimer des sauvegardes' },
      { name: 'backups.download', description: 'Télécharger des sauvegardes' }
    ]
  },

  logs: {
    label: 'Journaux Système',
    permissions: [
      { name: 'logs.view', description: 'Consulter les logs système' },
      { name: 'logs.view_application', description: 'Voir les logs applicatifs' },
      { name: 'logs.view_database', description: 'Voir les logs base de données' },
      { name: 'logs.view_error', description: 'Voir les logs d\'erreur' },
      { name: 'logs.export', description: 'Exporter les logs' },
      { name: 'logs.delete', description: 'Supprimer des logs' }
    ]
  },

  integrations: {
    label: 'Intégrations',
    permissions: [
      { name: 'integrations.view', description: 'Consulter les intégrations' },
      { name: 'integrations.create', description: 'Créer des intégrations' },
      { name: 'integrations.update', description: 'Modifier les intégrations' },
      { name: 'integrations.delete', description: 'Supprimer des intégrations' },
      { name: 'integrations.test', description: 'Tester les intégrations' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // 📄 DOCUMENTS & FICHIERS
  // ═══════════════════════════════════════════════════════════
  documents: {
    label: 'Documents',
    permissions: [
      { name: 'documents.view', description: 'Consulter les documents' },
      { name: 'documents.view_all', description: 'Voir tous les documents' },
      { name: 'documents.view_own', description: 'Voir uniquement ses documents' },
      { name: 'documents.upload', description: 'Téléverser des documents' },
      { name: 'documents.download', description: 'Télécharger des documents' },
      { name: 'documents.update', description: 'Modifier les documents' },
      { name: 'documents.delete', description: 'Supprimer des documents' },
      { name: 'documents.share', description: 'Partager des documents' },
      { name: 'documents.manage_versions', description: 'Gérer les versions' }
    ]
  }
};

async function seedCompletePermissions() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🌱 INITIALISATION COMPLÈTE DES PERMISSIONS SYSTÈME        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const categoryCount = Object.keys(completePermissions).length;
  let currentCategory = 0;

  for (const [categoryKey, categoryData] of Object.entries(completePermissions)) {
    currentCategory++;
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📁 [${currentCategory}/${categoryCount}] ${categoryData.label} (${categoryKey})`);
    console.log(`${'─'.repeat(70)}`);

    for (const perm of categoryData.permissions) {
      try {
        // Vérifier si la permission existe déjà
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name }
        });

        if (existing) {
          console.log(`   ⏭️  ${perm.name.padEnd(50)} [existe déjà]`);
          totalSkipped++;
        } else {
          await prisma.permission.create({
            data: {
              name: perm.name,
              description: perm.description,
              category: categoryKey
            }
          });
          console.log(`   ✅ ${perm.name.padEnd(50)} [créée]`);
          totalCreated++;
        }
      } catch (error) {
        console.error(`   ❌ ${perm.name.padEnd(50)} [ERREUR: ${error.message}]`);
        totalErrors++;
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 RÉSUMÉ DE L\'INITIALISATION');
  console.log('═'.repeat(70));
  console.log(`   ✅ Permissions créées:           ${totalCreated.toString().padStart(4)}`);
  console.log(`   ⏭️  Permissions ignorées:         ${totalSkipped.toString().padStart(4)} (déjà existantes)`);
  console.log(`   ❌ Erreurs rencontrées:           ${totalErrors.toString().padStart(4)}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   📝 Total traité:                  ${(totalCreated + totalSkipped + totalErrors).toString().padStart(4)}`);

  // Compter le total en base
  const totalInDb = await prisma.permission.count();
  console.log(`\n💾 Total de permissions en base de données: ${totalInDb}`);

  // Statistiques par catégorie
  console.log('\n📈 RÉPARTITION PAR CATÉGORIE:');
  console.log('═'.repeat(70));
  
  const categories = await prisma.permission.groupBy({
    by: ['category'],
    _count: {
      category: true
    },
    orderBy: {
      _count: {
        category: 'desc'
      }
    }
  });

  for (const cat of categories) {
    const categoryLabel = completePermissions[cat.category]?.label || cat.category;
    console.log(`   ${categoryLabel.padEnd(40)} ${cat._count.category.toString().padStart(3)} permissions`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✨ INITIALISATION TERMINÉE AVEC SUCCÈS!');
  console.log('═'.repeat(70) + '\n');
}

async function main() {
  try {
    await seedCompletePermissions();
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE lors de l\'initialisation:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
if (require.main === module) {
  main();
}

module.exports = { completePermissions, seedCompletePermissions };
