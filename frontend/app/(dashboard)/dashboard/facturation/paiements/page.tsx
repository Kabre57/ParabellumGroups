'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { billingService } from '@/shared/api/services/billing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', searchQuery, methodFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (searchQuery) params.query = searchQuery;
      if (methodFilter !== 'all') params.method = methodFilter;
      const data = await billingService.getPayments(params);
      return data;
    },
  });

  const getMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }> = {
      CASH: { label: 'Espèces', variant: 'success' },
      BANK_TRANSFER: { label: 'Virement', variant: 'default' },
      CHECK: { label: 'Chèque', variant: 'outline' },
      CREDIT_CARD: { label: 'Carte bancaire', variant: 'secondary' },
    };

    const config = methodConfig[method] || { label: method, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Paiements
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez vos paiements reçus
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Enregistrer un paiement
        </Button>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Rechercher par numéro, facture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">Toutes les méthodes</option>
              <option value="CASH">Espèces</option>
              <option value="BANK_TRANSFER">Virement</option>
              <option value="CHECK">Chèque</option>
              <option value="CREDIT_CARD">Carte bancaire</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.payment_id}>
                  <TableCell className="font-medium">
                    PAY-{payment.payment_id}
                  </TableCell>
                  <TableCell>
                    {payment.invoice_num ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => router.push(`/dashboard/facturation/factures/${payment.invoice_num}`)}
                      >
                        INV-{payment.invoice_num}
                      </Button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{getMethodBadge(payment.method)}</TableCell>
                  <TableCell>{payment.reference || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert('Détails du paiement à implémenter')}
                    >
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucun paiement trouvé
            </p>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSuccess={() => setIsCreateDialogOpen(false)}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
