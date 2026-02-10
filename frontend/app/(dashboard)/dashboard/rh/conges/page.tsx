'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { hrService } from '@/shared/api/hr';
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
import LeaveRequestForm from '@/components/hr/LeaveRequestForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LeavesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', page, searchQuery, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (statusFilter !== 'all') {
        params.statut = statusFilter;
      }

      const response = await hrService.getConges(params);
      
      return response;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrService.approveConge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Demande de congé approuvée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'approbation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      hrService.rejectConge(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Demande de congé rejetée');
    },
    onError: () => {
      toast.error('Erreur lors du rejet');
    },
  });

  const handleApprove = (leave: any) => {
    if (confirm(`Approuver la demande de congé de ${leave.nbJours} jour(s) ?`)) {
      approveMutation.mutate(leave.id);
    }
  };

  const handleReject = (leave: any) => {
    const reason = prompt('Raison du rejet (optionnel):');
    if (reason !== null) {
      rejectMutation.mutate({ id: leave.id, reason: reason || undefined });
    }
  };

  const leaveRequests = data?.data || [];
  const pagination = data?.meta?.pagination;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'EN_ATTENTE':
        return 'outline';
      case 'APPROUVE':
        return 'success';
      case 'REFUSE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'APPROUVE':
        return 'Approuvé';
      case 'REFUSE':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ANNUEL: 'Congé annuel',
      MALADIE: 'Congé maladie',
      MATERNITE: 'Congé maternité',
      PATERNITE: 'Congé paternité',
      SANS_SOLDE: 'Congé sans solde',
      PARENTAL: 'Autre',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion des congés
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez les demandes de congés des employés
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Nouvelle demande
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Rechercher..."
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
              <option value="EN_ATTENTE">En attente</option>
              <option value="APPROUVE">Approuvé</option>
              <option value="REFUSE">Rejeté</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full"></div>
              <span>En attente</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/20 rounded-full"></div>
              <span>Approuvé</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-900/20 rounded-full"></div>
              <span>Rejeté</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : leaveRequests.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((leave: any) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">
                      {leave.employeId}
                      {leave.motif && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {leave.motif}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLeaveTypeLabel(leave.typeConge)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.dateDebut), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.dateFin), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {leave.nbJours} jour(s)
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(leave.statut)}>
                        {getStatusLabel(leave.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {leave.statut === 'EN_ATTENTE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(leave)}
                              disabled={approveMutation.isPending}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(leave)}
                              disabled={rejectMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Rejeter
                            </Button>
                          </>
                        )}
                        {leave.statut !== 'EN_ATTENTE' && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {leave.dateApprobation && `Le ${format(new Date(leave.dateApprobation), 'dd/MM/yyyy', { locale: fr })}`}
                          </span>
                        )}
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
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.total} demandes)
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={!(pagination.page > 1)}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!(pagination.page < pagination.totalPages)}
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
              Aucune demande de congé trouvée
            </p>
          </div>
        )}
      </Card>

      {/* Calendar View (Optional - Placeholder) */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Vue calendrier
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Vue calendrier des congés - À implémenter
          </p>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de congé</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}



