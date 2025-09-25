import React from 'react';
import { X, Calendar, User, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ViewLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: any;
}

const leaveTypeLabels = {
  ANNUAL: 'Congés annuels',
  SICK: 'Congé maladie',
  PERSONAL: 'Congé personnel',
  MATERNITY: 'Congé maternité',
  PATERNITY: 'Congé paternité',
  OTHER: 'Autre'
};

export const ViewLeaveModal: React.FC<ViewLeaveModalProps> = ({ isOpen, onClose, leave }) => {
  if (!isOpen || !leave) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const calculateDays = () => {
    if (leave.startDate && leave.endDate) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'PENDING':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Approuvée',
      REJECTED: 'Rejetée',
      CANCELLED: 'Annulée'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Demande de Congé {leave.leaveNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Statut */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon(leave.status)}
              <span className={`ml-2 inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                {getStatusLabel(leave.status)}
              </span>
            </div>
            {leave.status === 'APPROVED' && leave.approvedBy && (
              <div className="text-sm text-gray-500">
                Approuvée par {leave.approvedBy.firstName} {leave.approvedBy.lastName}
              </div>
            )}
          </div>

          {/* Employé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <div className="flex items-center">
              <User className="text-gray-400 h-4 w-4 mr-2" />
              <span className="font-medium">
                {leave.employee?.firstName} {leave.employee?.lastName}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ({leave.employee?.position})
              </span>
            </div>
          </div>

          {/* Type de congé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de congé</label>
            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {leaveTypeLabels[leave.leaveType as keyof typeof leaveTypeLabels]}
            </span>
          </div>

          {/* Période */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Période de Congé</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <div className="flex items-center">
                  <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{formatDate(leave.startDate)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <div className="flex items-center">
                  <Calendar className="text-gray-400 h-4 w-4 mr-2" />
                  <span>{formatDate(leave.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Durée */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">
                  Durée totale: {calculateDays()} jour{calculateDays() > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Motif */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <div className="flex items-start">
              <FileText className="text-gray-400 h-4 w-4 mr-2 mt-1" />
              <p className="text-sm text-gray-600">{leave.reason}</p>
            </div>
          </div>

          {/* Notes */}
          {leave.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes complémentaires</label>
              <p className="text-sm text-gray-600">{leave.notes}</p>
            </div>
          )}

          {/* Commentaire de rejet */}
          {leave.status === 'REJECTED' && leave.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-700 mb-1">Motif de rejet</label>
              <p className="text-sm text-red-600">{leave.rejectionReason}</p>
            </div>
          )}

          {/* Historique des approbations */}
          {leave.approvalHistory && leave.approvalHistory.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Historique des Approbations</h4>
              <div className="space-y-2">
                {leave.approvalHistory.map((approval: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(approval.status)}
                      <span className="ml-2 text-sm font-medium">
                        {approval.approver.firstName} {approval.approver.lastName}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({approval.approver.role})
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(approval.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates de création et modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Demande créée le:</span> {formatDate(leave.createdAt)}
            </div>
            <div>
              <span className="font-medium">Dernière modification:</span> {formatDate(leave.updatedAt)}
            </div>
          </div>

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

