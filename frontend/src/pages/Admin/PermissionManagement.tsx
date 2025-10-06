import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Search, Save, X, Check, Edit, Eye, Settings, FileText, Receipt, CreditCard, Package, DollarSign, BarChart3, UserCheck, Calendar, Wrench, FolderKanban, ShoppingCart, MessageSquare, Target, Workflow, KeyRound, GitBranch, ShoppingBag, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/api';

const roleLabels = {
  ADMIN: 'Administrateur',
  GENERAL_DIRECTOR: 'Directeur Général',
  SERVICE_MANAGER: 'Responsable de Service',
  EMPLOYEE: 'Employé',
  ACCOUNTANT: 'Comptable',
  COMMERCIAL: 'Commercial',
  PURCHASING_MANAGER: 'Responsable Achat'
};

// Permissions complètes basées sur votre base de données
const permissionCategories = {
  // Tableau de bord
  dashboard: {
    label: 'Tableau de Bord',
    color: 'bg-gray-100 text-gray-800',
    icon: BarChart3,
    permissions: [
      { key: 'dashboard.read', label: 'Accéder au tableau de bord' },
      { key: 'dashboard.analytics', label: 'Voir les statistiques' },
      { key: 'dashboard.reports', label: 'Générer des rapports' }
    ]
  },

  // Gestion des utilisateurs
  users: {
    label: 'Utilisateurs',
    color: 'bg-blue-100 text-blue-800',
    icon: Users,
    permissions: [
      { key: 'users.create', label: 'Créer des utilisateurs' },
      { key: 'users.read', label: 'Consulter les utilisateurs' },
      { key: 'users.update', label: 'Modifier les utilisateurs' },
      { key: 'users.delete', label: 'Supprimer des utilisateurs' },
      { key: 'users.manage_permissions', label: 'Gérer les permissions' },
      { key: 'users.reset_password', label: 'Réinitialiser les mots de passe' },
      { key: 'users.manage_roles', label: 'Gérer les rôles' }
    ]
  },

  // Service Commercial - Prospection
  prospects: {
    label: 'Prospection Commerciale',
    color: 'bg-orange-100 text-orange-800',
    icon: Target,
    permissions: [
      { key: 'prospects.create', label: 'Créer des prospects' },
      { key: 'prospects.read', label: 'Consulter les prospects' },
      { key: 'prospects.update', label: 'Modifier les prospects' },
      { key: 'prospects.delete', label: 'Supprimer des prospects' },
      { key: 'prospects.assign', label: 'Assigner des prospects' },
      { key: 'prospects.activities', label: 'Gérer les activités de prospection' },
      { key: 'prospects.convert', label: 'Convertir en client' }
    ]
  },

  // CRM - Pipeline
  crm: {
    label: 'Pipeline CRM',
    color: 'bg-purple-100 text-purple-800',
    icon: Workflow,
    permissions: [
      { key: 'crm.pipeline.read', label: 'Voir le pipeline' },
      { key: 'crm.pipeline.update', label: 'Modifier le pipeline' },
      { key: 'crm.stages.manage', label: 'Gérer les étapes' },
      { key: 'crm.opportunities.create', label: 'Créer des opportunités' }
    ]
  },

  // Gestion des clients
  customers: {
    label: 'Clients',
    color: 'bg-green-100 text-green-800',
    icon: Users,
    permissions: [
      { key: 'customers.create', label: 'Créer des clients' },
      { key: 'customers.read', label: 'Consulter les clients' },
      { key: 'customers.update', label: 'Modifier les clients' },
      { key: 'customers.delete', label: 'Supprimer des clients' },
      { key: 'customers.contacts', label: 'Gérer les contacts clients' },
      { key: 'customers.addresses', label: 'Gérer les adresses' },
      { key: 'customers.credit', label: 'Gérer les limites de crédit' }
    ]
  },

  // Gestion des devis
  quotes: {
    label: 'Devis',
    color: 'bg-yellow-100 text-yellow-800',
    icon: FileText,
    permissions: [
      { key: 'quotes.create', label: 'Créer des devis' },
      { key: 'quotes.read', label: 'Consulter les devis' },
      { key: 'quotes.update', label: 'Modifier les devis' },
      { key: 'quotes.delete', label: 'Supprimer des devis' },
      { key: 'quotes.submit_for_approval', label: 'Soumettre pour approbation' },
      { key: 'quotes.approve_service', label: 'Approuver (Service)' },
      { key: 'quotes.approve_dg', label: 'Approuver (DG)' },
      { key: 'quotes.export', label: 'Exporter les devis' },
      { key: 'quotes.dqe', label: 'Gérer les devis DQE' }
    ]
  },

  // Gestion des factures
  invoices: {
    label: 'Factures',
    color: 'bg-red-100 text-red-800',
    icon: Receipt,
    permissions: [
      { key: 'invoices.create', label: 'Créer des factures' },
      { key: 'invoices.read', label: 'Consulter les factures' },
      { key: 'invoices.update', label: 'Modifier les factures' },
      { key: 'invoices.delete', label: 'Supprimer des factures' },
      { key: 'invoices.send', label: 'Envoyer les factures' },
      { key: 'invoices.credit_notes', label: 'Gérer les avoirs' },
      { key: 'invoices.proforma', label: 'Gérer les proformas' }
    ]
  },

  // Gestion des paiements
  payments: {
    label: 'Paiements',
    color: 'bg-indigo-100 text-indigo-800',
    icon: CreditCard,
    permissions: [
      { key: 'payments.create', label: 'Enregistrer des paiements' },
      { key: 'payments.read', label: 'Consulter les paiements' },
      { key: 'payments.update', label: 'Modifier les paiements' },
      { key: 'payments.delete', label: 'Supprimer des paiements' },
      { key: 'payments.allocate', label: 'Affecter les paiements' },
      { key: 'payments.reconcile', label: 'Rapprocher les paiements' }
    ]
  },

  // Gestion des produits
  products: {
    label: 'Produits',
    color: 'bg-pink-100 text-pink-800',
    icon: Package,
    permissions: [
      { key: 'products.create', label: 'Créer des produits' },
      { key: 'products.read', label: 'Consulter les produits' },
      { key: 'products.update', label: 'Modifier les produits' },
      { key: 'products.delete', label: 'Supprimer des produits' },
      { key: 'products.prices', label: 'Gérer les prix' },
      { key: 'products.inventory', label: 'Gérer le stock' },
      { key: 'products.categories', label: 'Gérer les catégories' }
    ]
  },

  // Gestion des dépenses
  expenses: {
    label: 'Dépenses',
    color: 'bg-amber-100 text-amber-800',
    icon: DollarSign,
    permissions: [
      { key: 'expenses.create', label: 'Créer des dépenses' },
      { key: 'expenses.read', label: 'Consulter les dépenses' },
      { key: 'expenses.update', label: 'Modifier les dépenses' },
      { key: 'expenses.delete', label: 'Supprimer des dépenses' },
      { key: 'expenses.approve', label: 'Approuver les dépenses' },
      { key: 'expenses.categories', label: 'Gérer les catégories' }
    ]
  },

  // Rapports et analytiques
  reports: {
    label: 'Rapports',
    color: 'bg-teal-100 text-teal-800',
    icon: BarChart3,
    permissions: [
      { key: 'reports.financial', label: 'Rapports financiers' },
      { key: 'reports.sales', label: 'Rapports de vente' },
      { key: 'reports.audit', label: 'Logs d\'audit' },
      { key: 'reports.performance', label: 'Rapports de performance' },
      { key: 'reports.export', label: 'Exporter les rapports' }
    ]
  },

  // Ressources Humaines - Employés
  employees: {
    label: 'Employés',
    color: 'bg-cyan-100 text-cyan-800',
    icon: UserCheck,
    permissions: [
      { key: 'employees.create', label: 'Créer des employés' },
      { key: 'employees.read', label: 'Consulter les employés' },
      { key: 'employees.update', label: 'Modifier les employés' },
      { key: 'employees.delete', label: 'Supprimer des employés' },
      { key: 'employees.contracts', label: 'Gérer les contrats' },
      { key: 'employees.files', label: 'Gérer les dossiers' }
    ]
  },

  // RH - Salaires
  salaries: {
    label: 'Salaires',
    color: 'bg-lime-100 text-lime-800',
    icon: DollarSign,
    permissions: [
      { key: 'salaries.create', label: 'Créer des fiches de paie' },
      { key: 'salaries.read', label: 'Consulter les salaires' },
      { key: 'salaries.update', label: 'Modifier les salaires' },
      { key: 'salaries.delete', label: 'Supprimer les salaires' },
      { key: 'salaries.process', label: 'Traiter les paies' },
      { key: 'salaries.reports', label: 'Rapports de paie' }
    ]
  },

  // RH - Contrats
  contracts: {
    label: 'Contrats',
    color: 'bg-violet-100 text-violet-800',
    icon: FileText,
    permissions: [
      { key: 'contracts.create', label: 'Créer des contrats' },
      { key: 'contracts.read', label: 'Consulter les contrats' },
      { key: 'contracts.update', label: 'Modifier les contrats' },
      { key: 'contracts.delete', label: 'Supprimer des contrats' },
      { key: 'contracts.renew', label: 'Renouveler les contrats' }
    ]
  },

  // RH - Congés
  leaves: {
    label: 'Congés',
    color: 'bg-rose-100 text-rose-800',
    icon: Calendar,
    permissions: [
      { key: 'leaves.create', label: 'Créer des demandes' },
      { key: 'leaves.read', label: 'Consulter les demandes' },
      { key: 'leaves.update', label: 'Modifier les demandes' },
      { key: 'leaves.approve', label: 'Approuver les demandes' },
      { key: 'leaves.balance', label: 'Gérer les soldes' }
    ]
  },

  // RH - Prêts
  loans: {
    label: 'Prêts',
    color: 'bg-emerald-100 text-emerald-800',
    icon: DollarSign,
    permissions: [
      { key: 'loans.create', label: 'Créer des prêts' },
      { key: 'loans.read', label: 'Consulter les prêts' },
      { key: 'loans.update', label: 'Modifier les prêts' },
      { key: 'loans.delete', label: 'Supprimer des prêts' },
      { key: 'loans.approve', label: 'Approuver les prêts' }
    ]
  },

  // Services Techniques - Spécialités
  specialites: {
    label: 'Spécialités Techniques',
    color: 'bg-blue-gray-100 text-blue-gray-800',
    icon: Wrench,
    permissions: [
      { key: 'specialites.create', label: 'Créer des spécialités' },
      { key: 'specialites.read', label: 'Consulter les spécialités' },
      { key: 'specialites.update', label: 'Modifier les spécialités' },
      { key: 'specialites.delete', label: 'Supprimer des spécialités' }
    ]
  },

  // Services Techniques - Techniciens
  techniciens: {
    label: 'Techniciens',
    color: 'bg-light-blue-100 text-light-blue-800',
    icon: Users,
    permissions: [
      { key: 'techniciens.create', label: 'Créer des techniciens' },
      { key: 'techniciens.read', label: 'Consulter les techniciens' },
      { key: 'techniciens.update', label: 'Modifier les techniciens' },
      { key: 'techniciens.delete', label: 'Supprimer des techniciens' },
      { key: 'techniciens.schedule', label: 'Planifier les techniciens' },
      { key: 'techniciens.availability', label: 'Gérer les disponibilités' }
    ]
  },

  // Services Techniques - Missions
  missions: {
    label: 'Missions',
    color: 'bg-cyan-100 text-cyan-800',
    icon: GitBranch,
    permissions: [
      { key: 'missions.create', label: 'Créer des missions' },
      { key: 'missions.read', label: 'Consulter les missions' },
      { key: 'missions.update', label: 'Modifier les missions' },
      { key: 'missions.delete', label: 'Supprimer des missions' },
      { key: 'missions.assign', label: 'Assigner des missions' },
      { key: 'missions.track', label: 'Suivre les missions' }
    ]
  },

  // Services Techniques - Interventions
  interventions: {
    label: 'Interventions',
    color: 'bg-light-green-100 text-light-green-800',
    icon: Wrench,
    permissions: [
      { key: 'interventions.create', label: 'Créer des interventions' },
      { key: 'interventions.read', label: 'Consulter les interventions' },
      { key: 'interventions.update', label: 'Modifier les interventions' },
      { key: 'interventions.delete', label: 'Supprimer des interventions' },
      { key: 'interventions.schedule', label: 'Planifier les interventions' }
    ]
  },

  // Services Techniques - Matériel
  materiels: {
    label: 'Matériel Technique',
    color: 'bg-deep-orange-100 text-deep-orange-800',
    icon: Package,
    permissions: [
      { key: 'materiels.create', label: 'Créer du matériel' },
      { key: 'materiels.read', label: 'Consulter le matériel' },
      { key: 'materiels.update', label: 'Modifier le matériel' },
      { key: 'materiels.delete', label: 'Supprimer du matériel' },
      { key: 'materiels.inventory', label: 'Gérer l\'inventaire' },
      { key: 'materiels.maintenance', label: 'Gérer la maintenance' }
    ]
  },

  // Gestion de Projets
  projects: {
    label: 'Projets Clients',
    color: 'bg-purple-100 text-purple-800',
    icon: FolderKanban,
    permissions: [
      { key: 'projects.create', label: 'Créer des projets' },
      { key: 'projects.read', label: 'Consulter les projets' },
      { key: 'projects.update', label: 'Modifier les projets' },
      { key: 'projects.delete', label: 'Supprimer des projets' },
      { key: 'projects.manage', label: 'Gérer les projets' },
      { key: 'projects.budget', label: 'Gérer les budgets' }
    ]
  },

  // Planning
  calendar: {
    label: 'Planning',
    color: 'bg-pink-100 text-pink-800',
    icon: CalendarDays,
    permissions: [
      { key: 'calendar.read', label: 'Consulter le planning' },
      { key: 'calendar.create', label: 'Créer des événements' },
      { key: 'calendar.update', label: 'Modifier le planning' },
      { key: 'calendar.delete', label: 'Supprimer des événements' },
      { key: 'calendar.manage', label: 'Gérer le calendrier' },
      { key: 'calendar.events.read', label: 'événements lieé a utilisateur' }
    ]
  },

  // Performance
  performance: {
    label: 'Performance',
    color: 'bg-amber-100 text-amber-800',
    icon: BarChart3,
    permissions: [
      { key: 'performance.read', label: 'Consulter les performances' },
      { key: 'performance.reviews', label: 'Gérer les évaluations' },
      { key: 'performance.metrics', label: 'Voir les métriques' }
    ]
  },

  // Service Achat - Commandes
  purchases: {
    label: 'Commandes',
    color: 'bg-brown-100 text-brown-800',
    icon: ShoppingCart,
    permissions: [
      { key: 'purchases.create', label: 'Créer des commandes' },
      { key: 'purchases.read', label: 'Consulter les commandes' },
      { key: 'purchases.update', label: 'Modifier les commandes' },
      { key: 'purchases.delete', label: 'Supprimer des commandes' },
      { key: 'purchases.approve', label: 'Approuver les commandes' }
    ]
  },

  // Service Achat - Fournisseurs
  suppliers: {
    label: 'Fournisseurs',
    color: 'bg-deep-purple-100 text-deep-purple-800',
    icon: ShoppingBag,
    permissions: [
      { key: 'suppliers.create', label: 'Créer des fournisseurs' },
      { key: 'suppliers.read', label: 'Consulter les fournisseurs' },
      { key: 'suppliers.update', label: 'Modifier les fournisseurs' },
      { key: 'suppliers.delete', label: 'Supprimer des fournisseurs' },
      { key: 'suppliers.evaluate', label: 'Évaluer les fournisseurs' }
    ]
  },

  // Communication - Messages
  messages: {
    label: 'Messages',
    color: 'bg-light-blue-100 text-light-blue-800',
    icon: MessageSquare,
    permissions: [
      { key: 'messages.create', label: 'Envoyer des messages' },
      { key: 'messages.read', label: 'Lire les messages' },
      { key: 'messages.delete', label: 'Supprimer des messages' },
      { key: 'messages.manage', label: 'Gérer la messagerie' }
    ]
  },

  // Administration
  admin: {
    label: 'Administration',
    color: 'bg-gray-100 text-gray-800',
    icon: Settings,
    permissions: [
      { key: 'admin.system_settings', label: 'Paramètres système' },
      { key: 'admin.backup', label: 'Sauvegardes' },
      { key: 'admin.logs', label: 'Logs système' },
      { key: 'admin.services', label: 'Gérer les services' },
      { key: 'admin.database', label: 'Base de données' }
    ]
  },

  // Facturation récurrente
  recurring: {
    label: 'Facturation Récurrente',
    color: 'bg-indigo-100 text-indigo-800',
    icon: CreditCard,
    permissions: [
      { key: 'recurring.create', label: 'Créer des factures récurrentes' },
      { key: 'recurring.read', label: 'Consulter les factures récurrentes' },
      { key: 'recurring.update', label: 'Modifier les factures récurrentes' },
      { key: 'recurring.delete', label: 'Supprimer les factures récurrentes' }
    ]
  },

  // Relances
  reminders: {
    label: 'Relances',
    color: 'bg-red-100 text-red-800',
    icon: MessageSquare,
    permissions: [
      { key: 'reminders.create', label: 'Créer des relances' },
      { key: 'reminders.read', label: 'Consulter les relances' },
      { key: 'reminders.update', label: 'Modifier les relances' },
      { key: 'reminders.delete', label: 'Supprimer des relances' },
      { key: 'reminders.send', label: 'Envoyer des relances' }
    ]
  }
};

export const PermissionManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userService.getAll({ search, limit: 100 })
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: string[] }) =>
      userService.updatePermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
      setError(null);
    },
    onError: (error: any) => {
      setError(`Erreur lors de la sauvegarde: ${error.message}`);
      console.error('Erreur de mutation:', error);
    }
  });

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    setIsEditing(false);
    setError(null);
    
    try {
      const response = await userService.getPermissions(user.id);
      setUserPermissions(response.data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des permissions:', error);
      setError(`Erreur lors du chargement: ${error.message}`);
      setUserPermissions([]);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setUserPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    
    try {
      await updatePermissionsMutation.mutateAsync({
        userId: selectedUser.id,
        permissions: userPermissions
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const getAllPermissions = () => {
    return Object.values(permissionCategories).flatMap(category => 
      category.permissions.map(p => p.key)
    );
  };

  const handleSelectAll = () => {
    setUserPermissions(getAllPermissions());
  };

  const handleDeselectAll = () => {
    setUserPermissions([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const usersList = users?.data?.users || [];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Permissions</h1>
          <p className="text-gray-600">Attribuez des permissions spécifiques à chaque utilisateur</p>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des utilisateurs */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Utilisateurs</h3>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {usersList.map((user: any) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      <div className="text-xs text-blue-600">
                        {roleLabels[user.role as keyof typeof roleLabels]}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration des permissions */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Permissions de {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {roleLabels[selectedUser.role as keyof typeof roleLabels]} • {selectedUser.service?.name || 'Aucun service'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Modifier</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSavePermissions}
                          disabled={updatePermissionsMutation.isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          <span>Sauvegarder</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            handleUserSelect(selectedUser);
                          }}
                          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <X className="h-4 w-4" />
                          <span>Annuler</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {isEditing && (
                  <div className="mt-4 flex items-center space-x-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Tout désélectionner
                    </button>
                    <div className="text-sm text-gray-500">
                      {userPermissions.length} permission(s) sélectionnée(s)
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {Object.entries(permissionCategories).map(([categoryKey, category]) => {
                    const CategoryIcon = category.icon || Shield;
                    return (
                      <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <CategoryIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <h4 className="text-lg font-medium text-gray-900">{category.label}</h4>
                            <span className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${category.color}`}>
                              {category.permissions.length} permissions
                            </span>
                          </div>
                          {isEditing && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  const categoryPermissions = category.permissions.map(p => p.key);
                                  const hasAll = categoryPermissions.every(p => userPermissions.includes(p));
                                  if (hasAll) {
                                    setUserPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)));
                                  } else {
                                    setUserPermissions(prev => [...new Set([...prev, ...categoryPermissions])]);
                                  }
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {category.permissions.every(p => userPermissions.includes(p.key)) ? 'Désélectionner tout' : 'Sélectionner tout'}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.permissions.map((permission) => (
                            <div key={permission.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${
                                  userPermissions.includes(permission.key) 
                                    ? 'bg-green-500' 
                                    : 'bg-gray-300'
                                }`}></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {permission.label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {permission.key}
                                  </div>
                                </div>
                              </div>
                              {isEditing && (
                                <button
                                  onClick={() => handlePermissionToggle(permission.key)}
                                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                    userPermissions.includes(permission.key)
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 hover:border-blue-500'
                                  }`}
                                >
                                  {userPermissions.includes(permission.key) && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez un utilisateur
              </h3>
              <p className="text-gray-500">
                Choisissez un utilisateur dans la liste pour configurer ses permissions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Résumé des rôles par défaut */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Permissions par Rôle (Défaut)</h3>
          <p className="text-sm text-gray-500">
            Permissions standard attribuées automatiquement selon le rôle
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Shield className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="font-medium text-gray-900">{label}</h4>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {role === 'ADMIN' && (
                    <div>
                      <div className="font-medium text-green-600">✓ Accès complet</div>
                      <div>Toutes les fonctionnalités système</div>
                    </div>
                  )}
                  {role === 'GENERAL_DIRECTOR' && (
                    <div>
                      <div className="font-medium text-blue-600">✓ Validation finale</div>
                      <div>Approbation devis, rapports complets, supervision</div>
                    </div>
                  )}
                  {role === 'SERVICE_MANAGER' && (
                    <div>
                      <div className="font-medium text-purple-600">✓ Gestion service</div>
                      <div>Son service + validation devis + équipe</div>
                    </div>
                  )}
                  {role === 'EMPLOYEE' && (
                    <div>
                      <div className="font-medium text-yellow-600">✓ Opérations courantes</div>
                      <div>Création devis, gestion clients basique</div>
                    </div>
                  )}
                  {role === 'ACCOUNTANT' && (
                    <div>
                      <div className="font-medium text-indigo-600">✓ Gestion financière</div>
                      <div>Factures, paiements, rapports financiers</div>
                    </div>
                  )}
                  {role === 'COMMERCIAL' && (
                    <div>
                      <div className="font-medium text-orange-600">✓ Activités commerciales</div>
                      <div>Prospection, clients, devis, pipeline</div>
                    </div>
                  )}
                  {role === 'PURCHASING_MANAGER' && (
                    <div>
                      <div className="font-medium text-brown-600">✓ Gestion achats</div>
                      <div>Commandes, fournisseurs, approvisionnement</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};