'use client';

import React, { useEffect, useState } from 'react';
import { PermissionChangeRequest } from '@/types/permissionWorkflow';
import { permissionRequestService } from '@/services/permissionRequestService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ListeDemandesEnAttenteProps {
  requests?: PermissionChangeRequest[];
  loading?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason: string) => void;
  approving?: boolean;
  rejecting?: boolean;
  canManageRequests?: boolean;
}

export const ListeDemandesEnAttente: React.FC<ListeDemandesEnAttenteProps> = ({
  requests: externalRequests,
  loading: externalLoading,
  onApprove: externalOnApprove,
  onReject: externalOnReject,
  approving = false,
  rejecting = false,
  canManageRequests = true,
}) => {
  const [internalRequests, setInternalRequests] = useState<PermissionChangeRequest[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<PermissionChangeRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PermissionChangeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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
      toast.success('Demande approuvée avec succès');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'approbation');
    }
  };

  const handleReject = async (id: number) => {
    if (externalOnReject) {
      externalOnReject(id, rejectReason || '');
      return;
    }

    try {
      await permissionRequestService.rejectRequest(id, rejectReason || undefined);
      await chargerDemandesEnAttente();
      toast.success('Demande rejetée avec succès');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du rejet');
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
          className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition"
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
          <div className="bg-gray-50 p-4 rounded-xl mb-4">
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
          {canManageRequests && (
            <div className="flex gap-3">
              <Button
                onClick={() => setApproveTarget(req)}
                disabled={approving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {approving ? 'Approbation...' : '✓ Approuver'}
              </Button>
              <Button
                onClick={() => {
                  setRejectReason('');
                  setRejectTarget(req);
                }}
                disabled={rejecting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {rejecting ? 'Rejet...' : '✗ Rejeter'}
              </Button>
            </div>
          )}
        </div>
      ))}

      <Dialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Confirmez l&apos;approbation de la demande de permission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approving}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!approveTarget) return;
                handleApprove(approveTarget.id);
                setApproveTarget(null);
              }}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700"
            >
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Indiquez un motif si nécessaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motif (optionnel)</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Raison du rejet..."
              className="min-h-[90px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectTarget) return;
                handleReject(rejectTarget.id);
                setRejectTarget(null);
              }}
              disabled={rejecting}
            >
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const PendingRequestsList = ListeDemandesEnAttente;
