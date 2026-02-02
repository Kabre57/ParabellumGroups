'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmService } from '@/shared/api/services/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContractsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', page],
    queryFn: async () => {
      const response = await crmService.getContrats({ page, limit: 10 });
      return response.data;
    },
  });

  const contracts = data?.data || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      'ACTIF': 'bg-green-100 text-green-800',
      'BROUILLON': 'bg-gray-100 text-gray-800',
      'EN_ATTENTE_SIGNATURE': 'bg-yellow-100 text-yellow-800',
      'SUSPENDU': 'bg-orange-100 text-orange-800',
      'TERMINE': 'bg-blue-100 text-blue-800',
      'RESILIE': 'bg-red-100 text-red-800',
    };
    return <Badge className={statuses[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contrats</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Suivi et gestion des contrats clients</p>
        </div>
        <Button>Nouveau contrat</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrats Actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'ACTIF').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'EN_ATTENTE_SIGNATURE').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À renouveler</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Fin de contrat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.numeroContrat || contract.reference}</TableCell>
                  <TableCell>{contract.titre}</TableCell>
                  <TableCell>{contract.client?.nom || 'Inconnu'}</TableCell>
                  <TableCell>{contract.typeContrat}</TableCell>
                  <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.devise || 'EUR' }).format(contract.montantTTC)}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell>{contract.dateFin ? new Date(contract.dateFin).toLocaleDateString('fr-FR') : 'Indéterminée'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">Voir</Button>
                  </TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Aucun contrat trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
