// components/Commercial/ProspectActivityTimeline.tsx
import React from 'react';
import { Calendar, User, Phone, Mail, MessageSquare, FileText } from 'lucide-react';

interface Activity {
  id: number;
  type: string;
  subject: string;
  description: string;
  scheduledAt?: string;
  completedAt: string;
  outcome?: string;
  creator: {
    firstName: string;
    lastName: string;
  };
}

interface ProspectActivityTimelineProps {
  activities: Activity[];
}

export const ProspectActivityTimeline: React.FC<ProspectActivityTimelineProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      activity.type === 'call' ? 'bg-blue-500' :
                      activity.type === 'email' ? 'bg-purple-500' :
                      activity.type === 'meeting' ? 'bg-green-500' :
                      activity.type === 'note' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}
                  >
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">
                      {activity.description}{' '}
                      <span className="font-medium text-gray-900">
                        {activity.subject}
                      </span>
                    </p>
                    {activity.outcome && (
                      <p className="mt-1 text-xs text-gray-500">Résultat: {activity.outcome}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={activity.completedAt}>
                      {formatDate(activity.completedAt)}
                    </time>
                    <p className="mt-1 text-xs text-gray-400">
                      par {activity.creator.firstName} {activity.creator.lastName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};