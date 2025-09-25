import React from 'react';
import { 
  FileText, 
  Receipt, 
  CreditCard, 
  Users, 
  CheckCircle, 
  XCircle,
  Clock,
  User
} from 'lucide-react';

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  user: string;
  status?: string;
  amount?: number;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'quote': return FileText;
    case 'invoice': return Receipt;
    case 'payment': return CreditCard;
    case 'customer': return Users;
    case 'approval': return CheckCircle;
    case 'rejection': return XCircle;
    default: return Clock;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'quote': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
    case 'invoice': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
    case 'payment': return 'text-green-600 bg-green-100 dark:bg-green-900';
    case 'customer': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900';
    case 'approval': return 'text-green-600 bg-green-100 dark:bg-green-900';
    case 'rejection': return 'text-red-600 bg-red-100 dark:bg-red-900';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Clock className="h-5 w-5 text-gray-400 mr-2" />
          Activités Récentes
        </h3>
      </div>
      <div className="p-6">
        {activities.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {index !== activities.length - 1 && (
                        <span
                          className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className={`relative px-1`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              <span className="font-medium">{activity.message}</span>
                            </div>
                            <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                              <User className="h-3 w-3" />
                              <span>{activity.user}</span>
                              <span>•</span>
                              <span>{activity.time}</span>
                              {activity.amount && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {new Intl.NumberFormat('fr-FR', {
                                      style: 'currency',
                                      currency: 'XOF',
                                      notation: 'compact'
                                    }).format(activity.amount)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Aucune activité récente
            </p>
          </div>
        )}
      </div>
    </div>
  );
};