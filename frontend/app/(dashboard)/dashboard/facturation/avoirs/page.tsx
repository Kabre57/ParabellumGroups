'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { billingService } from '@/shared/api/billing';
import { useClients } from '@/hooks/useCrm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (amount: number) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
};

export default function AvoirsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [factureId, setFactureId] = useState('');
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [enterpriseFilter, setEnterpriseFilter] = useState('all');

  const { canCreate } = getCrudVisibility(user, {
    read: ['invoices.read', 'invoices.read_all', 'invoices.read_own'],
    create: ['invoices.credit_note'],
  });

  const { data: enterprisesResponse } = useQuery({
    queryKey: ['enterprise-filter-options', 'avoirs'],
    queryFn: () => enterpriseApi.getAll({ limit: 200, isActive: true }),
  });

  const accessibleEnterprises = useMemo(
    () => getAccessibleEnterprises(enterprisesResponse?.data ?? [], user?.enterpriseId),
    [enterprisesResponse?.data, user?.enterpriseId]
  );

  const { data: creditNotesResponse, isLoading } = useQuery({
    queryKey: ['creditNotes', enterpriseFilter],
    queryFn: () =>
      billingService.getCreditNotes(
        enterpriseFilter !== 'all' ? { enterpriseId: enterpriseFilter } : undefined
      ),
  });

  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices-for-credit-notes', enterpriseFilter],
    queryFn: () =>
      billingService.getInvoices({
        limit: 200,
        ...(enterpriseFilter !== 'all' ? { enterpriseId: enterpriseFilter } : {}),
      }),
  });

  const { data: clients = [] } = useClients({ pageSize: 200 });
  const clientMap = useMemo(
    () => new Map((Array.isArray(clients) ? clients : []).map((client: any) => [client.id, client])),
    [clients]
  );

  const createMutation = useMutation({
    mutationFn: (payload: { factureId: string; motif: string; notes?: string }) => billingService.createCreditNote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', factureId] });
    },
  });

  const creditNotes = creditNotesResponse?.data ?? [];
  const invoices = invoicesResponse?.data ?? [];
  const totalAvoirs = creditNotes.reduce((sum, item) => sum + (item.montantTTC || 0), 0);

  const handleCreate = async () => {
    if (!factureId || !motif.trim()) {
      toast.error("La facture source et le motif sont obligatoires.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        factureId,
        motif: motif.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Avoir cree avec succes.');
      setFactureId('');
      setMotif('');
      setNotes('');
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Impossible de creer l'avoir.");
    }
  };

  const handlePrint = async (id: string) => {
    const blob = await billingService.getCreditNotePDF(id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avoirs & notes de credit</h1>
          <p className="mt-1 text-gray-600">Gestion des avoirs, annulations commerciales et notes de credit clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/facturation/factures')}>
            Voir les factures
          </Button>
          {canCreate && (
            <Button onClick={() => setIsDialogOpen(true)}>
              Nouvel avoir
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total des avoirs</div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(totalAvoirs)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Avoirs emis</div>
          <div className="mt-2 text-2xl font-bold">{creditNotes.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Factures impactees</div>
          <div className="mt-2 text-2xl font-bold">{new Set(creditNotes.map((item) => item.factureId)).size}</div>
        </Card>
      </div>

      <Card>
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">Liste des avoirs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulter, imprimer et rattacher les notes de credit aux factures clients.</p>
          <div className="mt-4 max-w-sm">
            <select
              value={enterpriseFilter}
              onChange={(event) => setEnterpriseFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Toutes les entreprises</option>
              {accessibleEnterprises.map((enterprise) => (
                <option key={String(enterprise.id)} value={String(enterprise.id)}>
                  {enterprise.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : creditNotes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Facture source</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map((creditNote) => (
                <TableRow key={creditNote.id}>
                  <TableCell className="font-medium">{creditNote.numeroAvoir}</TableCell>
                  <TableCell>{creditNote.factureNumero}</TableCell>
                  <TableCell>{clientMap.get(creditNote.clientId)?.nom || creditNote.clientId}</TableCell>
                  <TableCell>{creditNote.enterpriseName || '-'}</TableCell>
                  <TableCell>{creditNote.motif}</TableCell>
                  <TableCell>{formatCurrency(creditNote.montantTTC)}</TableCell>
                  <TableCell>{creditNote.status}</TableCell>
                  <TableCell>{formatDate(creditNote.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/facturation/factures/${creditNote.factureId}`)}>
                        Voir facture
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handlePrint(creditNote.id)}>
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun avoir enregistre pour le moment.
          </div>
        )}
      </Card>

      {canCreate && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvel avoir / note de credit</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Facture source</label>
                <select
                  value={factureId}
                  onChange={(event) => setFactureId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selectionner une facture</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.numeroFacture} - {clientMap.get(invoice.clientId)?.nom || invoice.clientId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motif de l&apos;avoir</label>
                <Input
                  value={motif}
                  onChange={(event) => setMotif(event.target.value)}
                  placeholder="Annulation, remise exceptionnelle, retour client..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Commentaires ou details de la note de credit"
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => void handleCreate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creation...' : "Creer l'avoir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
