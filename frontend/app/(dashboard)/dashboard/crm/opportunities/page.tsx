'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmService } from '@/shared/api/crm';
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
import { TrendingUp, DollarSign, Target, Calendar } from 'lucide-react';

export default function OpportunitiesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', page],
    queryFn: async () => {
      const response = await crmService.getOpportunites({ page, limit: 10 });
      return response;
    },
  });

  const opportunities = data?.data || [];
  const pagination = data?.meta?.pagination;
  const pipelineValue = data?.meta?.pipelineValue || 0;

  const getEtapeBadge = (etape: string) => {
    const stages: Record<string, string> = {
      'PROSPECTION': 'bg-blue-100 text-blue-800',
      'QUALIFICATION': 'bg-purple-100 text-purple-800',
      'PROPOSITION': 'bg-orange-100 text-orange-800',
      'NEGOCIATION': 'bg-yellow-100 text-yellow-800',
      'GAGNEE': 'bg-green-100 text-green-800',
      'PERDUE': 'bg-red-100 text-red-800',
    };
    return <Badge className={stages[etape] || 'bg-gray-100 text-gray-800'}>{etape}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Opportunités</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Gérez votre pipeline commercial</p>
        </div>
        <Button>Nouvelle opportunité</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur du Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(pipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunités Actives</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- %</div>
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
                <TableHead>Nom</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Probabilité</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead>Fermeture prévue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => (
                <TableRow key={opp.id}>
                  <TableCell className="font-medium">{opp.nom}</TableCell>
                  <TableCell>{opp.client?.nom || 'Inconnu'}</TableCell>
                  <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(opp.montantEstime)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${opp.probabilite}%` }}></div>
                      </div>
                      <span className="text-xs">{opp.probabilite}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getEtapeBadge(opp.etape)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {opp.dateFermetureEstimee ? new Date(opp.dateFermetureEstimee).toLocaleDateString('fr-FR') : 'Non définie'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">Détails</Button>
                  </TableCell>
                </TableRow>
              ))}
              {opportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Aucune opportunité trouvée
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
