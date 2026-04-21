'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { useAuth } from '@/shared/hooks/useAuth';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('fr-FR');
};

export default function PurchaseApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<PurchaseRequest | null>(null);
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const canApprove =
    isAdminRole(user) || permissionSet.has('purchase_requests.approve');
  const canReject = canApprove;

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-approvals-space'],
    queryFn: () => procurementService.getRequests({ limit: 200 }),
    enabled: canApprove || canReject,
  });

  const requests = useMemo(() => (data?.data ?? []).filter((request) => request.status === 'SOUMISE'), [data]);
  const pendingProformas = useMemo(
    () =>
      (data?.data ?? []).flatMap((request) =>
        (request.proformas || [])
          .filter((proforma) => proforma.status === 'SOUMISE')
          .map((proforma) => ({ request, proforma }))
      ),
    [data]
  );

  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementService.approveRequest(id, 'Validé depuis l’espace PDG'),
    onSuccess: () => {
      toast.success('La demande a été validée.');
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la validation.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementService.rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('La demande a été rejetée.');
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet.');
    },
  });

  const approveProformaMutation = useMutation({
    mutationFn: ({ requestId, proformaId }: { requestId: string; proformaId: string }) =>
      procurementService.approveProforma(requestId, proformaId, 'Validée depuis l’espace PDG'),
    onSuccess: () => {
      toast.success('La proforma a été validée.');
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la validation de la proforma.');
    },
  });

  const rejectProformaMutation = useMutation({
    mutationFn: ({ requestId, proformaId, reason }: { requestId: string; proformaId: string; reason: string }) =>
      procurementService.rejectProforma(requestId, proformaId, reason),
    onSuccess: () => {
      toast.success('La proforma a été rejetée.');
      queryClient.invalidateQueries({ queryKey: ['purchase-approvals-space'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-quote-detail'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet de la proforma.');
    },
  });

  if (!canApprove && !canReject) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Validation Achats</CardTitle>
            <CardDescription>Accès réservé aux validateurs.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vous n&apos;avez pas la permission d&apos;accéder à cet espace.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Validation Achats</h1>
        <p className="text-sm text-muted-foreground">
          Espace PDG pour valider d’abord les devis internes, puis les proformas retenues par le service achat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devis internes en attente de validation</CardTitle>
          <CardDescription>
            Les devis internes soumis apparaissent ici avant la phase proformas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Date de besoin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.number}</TableCell>
                    <TableCell>{request.objet || request.title}</TableCell>
                    <TableCell>{request.serviceName || '-'}</TableCell>
                    <TableCell>{request.requesterEmail || '-'}</TableCell>
                    <TableCell>{formatDate(request.dateBesoin)}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">Soumise</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/achats/devis/${request.id}`}>Ouvrir</Link>
                        </Button>
                        {canApprove && (
                          <Button size="sm" onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Valider
                          </Button>
                        )}
                        {canReject && (
                          <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)} disabled={rejectMutation.isPending}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucun devis interne en attente de validation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proformas en attente de validation</CardTitle>
          <CardDescription>
            Le service achat soumet ici la proforma retenue au PDG avant génération du bon de commande.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Devis source</TableHead>
                  <TableHead>Proforma</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingProformas.map(({ request, proforma }: { request: PurchaseRequest; proforma: PurchaseProforma }) => (
                  <TableRow key={proforma.id}>
                    <TableCell className="font-medium">{request.number}</TableCell>
                    <TableCell>{proforma.numeroProforma}</TableCell>
                    <TableCell>{proforma.fournisseurNom || '-'}</TableCell>
                    <TableCell>{proforma.montantTTC.toLocaleString('fr-FR')} F</TableCell>
                    <TableCell>{formatDate(proforma.submittedAt || proforma.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/achats/devis/${request.id}`}>Ouvrir</Link>
                        </Button>
                        {canApprove && (
                          <Button
                            size="sm"
                            onClick={() => approveProformaMutation.mutate({ requestId: request.id, proformaId: proforma.id })}
                            disabled={approveProformaMutation.isPending}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Valider proforma
                          </Button>
                        )}
                        {canReject && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget({ ...request, number: proforma.numeroProforma, id: `${request.id}::${proforma.id}` })}
                            disabled={rejectProformaMutation.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeter proforma
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingProformas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Aucune proforma en attente de validation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RejectPurchaseRequestDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        requestNumber={rejectTarget?.number}
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          if (rejectTarget.id.includes('::')) {
            const [requestId, proformaId] = rejectTarget.id.split('::');
            rejectProformaMutation.mutate(
              { requestId, proformaId, reason },
              {
                onSuccess: () => setRejectTarget(null),
              }
            );
            return;
          }

          rejectMutation.mutate(
            { id: rejectTarget.id, reason },
            {
              onSuccess: () => setRejectTarget(null),
            }
          );
        }}
      />
    </div>
  );
}
