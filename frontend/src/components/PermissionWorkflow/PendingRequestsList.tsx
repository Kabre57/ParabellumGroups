'use client';

import React, { useEffect, useState } from 'react';
import { PermissionChangeRequest } from '@/types/permissionWorkflow';
import { permissionRequestService } from '@/services/permissionRequestService';

interface ListeDemandesEnAttenteProps {
  requests?: PermissionChangeRequest[];
  loading?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason: string) => void;
  approving?: boolean;
  rejecting?: boolean;
}

export const ListeDemandesEnAttente: React.FC<ListeDemandesEnAttenteProps> = ({
  requests: externalRequests,
  loading: externalLoading,
  onApprove: externalOnApprove,
  onReject: externalOnReject,
  approving = false,
  rejecting = false,
}) => {
  const [internalRequests, setInternalRequests] = useState<PermissionChangeRequest[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utiliser les données externes si fournies, sinon gérer l'état interne
  const requests = externalRequests !== undefined ? externalRequests : internalRequests;
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    if (externalRequests === undefined) {
      chargerDemandesEnAttente();
    }
  }, [externalRequests]);

  const chargerDemandesEnAttente = async () => {
    try {
      setInternalLoading(true);
      const data = await permissionRequestService.getPendingRequests();
      setInternalRequests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du chargement des demandes');
    } finally {
      setInternalLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (externalOnApprove) {
      externalOnApprove(id);
      return;
    }

    try {
      await permissionRequestService.approveRequest(id);
      await chargerDemandesEnAttente();
      alert('Demande approuvée avec succès');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Échec de l\'approbation');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Entrez la raison du rejet (optionnel) :');
    if (externalOnReject) {
      externalOnReject(id, reason || '');
      return;
    }

    try {
      await permissionRequestService.rejectRequest(id, reason || undefined);
      await chargerDemandesEnAttente();
      alert('Demande rejetée avec succès');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Échec du rejet');
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Chargement des demandes...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">Erreur : {error}</div>;
  }

  if (requests.length === 0) {
    return <div className="p-4 text-gray-500">Aucune demande en attente</div>;
  }

  return (
    <div className="space-y-4">
      {!externalRequests && <h2 className="text-2xl font-bold mb-6">Demandes de permission en attente ({requests.length})</h2>}

      {requests.map((req) => (
        <div
          key={req.id}
          className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Rôle</label>
              <p className="text-lg font-medium text-gray-900">
                {req.role?.name || `Rôle #${req.roleId}`}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Permission</label>
              <p className="text-lg font-medium text-gray-900">
                {req.permission?.name || `Permission #${req.permissionId}`}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Demandé par</label>
              <p className="text-gray-700">{req.requester?.email || `Utilisateur #${req.requestedBy}`}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Demandé le</label>
              <p className="text-gray-700">
                {new Date(req.requestedAt).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Détail des permissions demandées */}
          <div className="bg-gray-50 p-4 rounded mb-4">
            <p className="font-semibold mb-2">Permissions demandées :</p>
            <div className="grid grid-cols-5 gap-2 text-sm">
              {req.canView !== undefined && (
                <span className={req.canView ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  Voir : {req.canView ? '✓' : '✗'}
                </span>
              )}
              {req.canCreate !== undefined && (
                <span className={req.canCreate ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  Créer : {req.canCreate ? '✓' : '✗'}
                </span>
              )}
              {req.canEdit !== undefined && (
                <span className={req.canEdit ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  Modifier : {req.canEdit ? '✓' : '✗'}
                </span>
              )}
              {req.canDelete !== undefined && (
                <span className={req.canDelete ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  Supprimer : {req.canDelete ? '✓' : '✗'}
                </span>
              )}
              {req.canApprove !== undefined && (
                <span className={req.canApprove ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  Approuver : {req.canApprove ? '✓' : '✗'}
                </span>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={() => handleApprove(req.id)}
              disabled={approving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded transition"
            >
              {approving ? 'Approbation...' : '✓ Approuver'}
            </button>
            <button
              onClick={() => handleReject(req.id)}
              disabled={rejecting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded transition"
            >
              {rejecting ? 'Rejet...' : '✗ Rejeter'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PendingRequestsList = ListeDemandesEnAttente;
