import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Receipt, 
  Users, 
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  href: string;
  permission?: string;
}

export const QuickActions: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      title: 'Nouveau Client',
      description: 'Ajouter un client',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      href: '/customers/create',
      permission: 'customers.create'
    },
    {
      title: 'Créer un Devis',
      description: 'Nouveau devis',
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      href: '/quotes/create',
      permission: 'quotes.create'
    },
    {
      title: 'Nouvelle Facture',
      description: 'Créer une facture',
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      href: '/invoices/create',
      permission: 'invoices.create'
    },
    {
      title: 'Enregistrer Paiement',
      description: 'Nouveau paiement',
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
      href: '/payments/create',
      permission: 'payments.create'
    },
    {
      title: 'Ajouter Produit',
      description: 'Nouveau produit',
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
      href: '/products/create',
      permission: 'products.create'
    },
    {
      title: 'Voir Rapports',
      description: 'Analytics détaillés',
      icon: BarChart3,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      href: '/reports',
      permission: 'reports.sales'
    },
    {
      title: 'Nouvelle Mission',
      description: 'Créer une mission',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      href: '/services/missions',
      permission: 'missions.create'
    },
    {
      title: 'Nouvelle Intervention',
      description: 'Planifier intervention',
      icon: Calendar,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900',
      href: '/services/interventions',
      permission: 'interventions.create'
    }
  ];

  const visibleActions = actions.filter(action => 
    !action.permission || hasPermission(action.permission)
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Plus className="h-5 w-5 text-gray-400 mr-2" />
          Actions Rapides
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4">
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <button
                key={index}
                onClick={() => navigate(action.href)}
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
              >
                <div className={`flex-shrink-0 p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="ml-4 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {visibleActions.length === 0 && (
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Aucune action disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
};