'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import customersService from '@/shared/api/services/customers';
import { Client } from '@/shared/api/services/customers';
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
import CustomerForm from '@/components/customers/CustomerForm';

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, searchQuery, statusFilter],
    queryFn: async () => {
      const response = await customersService.getCustomers({
        page,
        pageSize: 10,
        query: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const handleDelete = (client: Client) => {
    if (confirm(`Êtes-vous sûr de vouloir archiver le client "${client.nom}" ?`)) {
      deleteMutation.mutate(client.id);
    }
  };

  const handleViewCustomer = (id: string) => {
    router.push(`/dashboard/clients/${id}`);
  };

  const clients = data?.data || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF': return <Badge variant="success">Actif</Badge>;
      case 'PROSPECT': return <Badge variant="warning">Prospect</Badge>;
      case 'INACTIF': return <Badge variant="secondary">Inactif</Badge>;
      case 'ARCHIVE': return <Badge variant="outline">Archivé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez vos clients et leurs informations CRM
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Nouveau client
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Rechercher par nom, email, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="PROSPECT">Prospect</option>
              <option value="INACTIF">Inactif</option>
              <option value="ARCHIVE">Archivé</option>
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
        ) : clients.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Nom / Raison Sociale</TableHead>
                  <TableHead>Contact Principal</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.reference}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{client.nom}</span>
                        {client.raisonSociale && (
                          <span className="text-xs text-gray-500">{client.raisonSociale}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.contacts && client.contacts[0] ? (
                        `${client.contacts[0].prenom} ${client.contacts[0].nom}`
                      ) : '-'}
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      {client.typeClient?.libelle || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(client.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCustomer(client.id)}
                        >
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(client)}
                          disabled={deleteMutation.isPending}
                        >
                          Archiver
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.currentPage} sur {pagination.totalPages} ({pagination.totalItems} clients)
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
              Aucun client trouvé
            </p>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['customers'] });
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}