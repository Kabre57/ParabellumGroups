'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import customersService from '@/shared/api/services/customers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function InteractionsHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-interactions', page],
    queryFn: async () => {
      // Note: customersService.getInteractions needs to support getting all if clientId is omitted
      // For now we use it as is, assuming the backend supports it or we'll fix the service
      const response = await customersService.getInteractions({ clientId: '' });
      return response;
    },
  });

  const interactions = data?.data || [];
  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Historique des Interactions
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Suivez tous les échanges avec vos clients
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : interactions.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Résultat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(interaction.dateInteraction).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {/* Assuming interaction includes client name from include in backend */}
                      {(interaction as any).client?.nom || 'Client inconnu'}
                    </TableCell>
                    <TableCell>{interaction.sujet}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{interaction.type}</Badge>
                    </TableCell>
                    <TableCell>{interaction.canal}</TableCell>
                    <TableCell>
                      <Badge variant={
                        interaction.resultat === 'POSITIF' ? 'success' : 
                        interaction.resultat === 'NEGATIF' ? 'destructive' : 'secondary'
                      }>
                        {interaction.resultat || 'NEUTRE'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} sur {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune interaction trouvée
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
