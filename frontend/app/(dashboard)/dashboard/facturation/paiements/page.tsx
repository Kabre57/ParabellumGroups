'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingService } from '@/shared/api/billing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PaymentForm from '@/components/billing/PaymentForm';

export default function PaiementsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { canCreate } = getCrudVisibility(user, {
    read: ['payments.read', 'payments.read_all', 'payments.read_own'],
    create: ['payments.create'],
  });

  const range = React.useMemo(() => {
    if (period === 'all') return {};
    const now = new Date();
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period]);

  const { data: paymentsResponse, isLoading } = useQuery({
    queryKey: ['payments', searchQuery, methodFilter, period],
    queryFn: async () => {
      const params: Record<string, any> = { ...range };
      if (searchQuery) params.query = searchQuery;
      if (methodFilter !== 'all') params.modePaiement = methodFilter;
      return billingService.getPayments(params);
    },
  });

  const payments = paymentsResponse?.data ?? [];

  const getMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      ESPECES: { label: 'Especes', variant: 'success' },
      VIREMENT: { label: 'Virement', variant: 'default' },
      CHEQUE: { label: 'Cheque', variant: 'outline' },
      CARTE: { label: 'Carte bancaire', variant: 'secondary' },
      PRELEVEMENT: { label: 'Prelevement', variant: 'warning' },
    };

    const config = methodConfig[method] || { label: method, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount || 0)} F CFA`;

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paiements</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Gerez vos paiements recus</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Enregistrer un paiement
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Rechercher par numero, facture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
          >
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
            <option value="all">Toutes les périodes</option>
          </select>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">Toutes les methodes</option>
            <option value="ESPECES">Especes</option>
            <option value="VIREMENT">Virement</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARTE">Carte bancaire</option>
          </select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12"><Spinner /></div>
        ) : payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.reference || payment.facture?.numeroFacture || `PAY-${String(payment.id).slice(0, 8)}`}
                  </TableCell>
                  <TableCell>
                    {payment.factureId ? (
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => router.push(`/dashboard/facturation/factures/${payment.factureId}`)}
                      >
                        {payment.facture?.numeroFacture || payment.factureId}
                      </Button>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(payment.datePaiement)}</TableCell>
                  <TableCell>{getMethodBadge(payment.modePaiement)}</TableCell>
                  <TableCell>{payment.treasuryAccountName || '-'}</TableCell>
                  <TableCell>{payment.reference || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(payment.montant)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        payment.factureId
                          ? router.push(`/dashboard/facturation/factures/${payment.factureId}`)
                          : router.push('/dashboard/facturation/factures')
                      }
                    >
                      Voir la facture
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">Aucun paiement trouve</div>
        )}
      </Card>

      {canCreate && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            <PaymentForm onSuccess={() => setIsCreateDialogOpen(false)} onCancel={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
