'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Eye, Download, Trash } from 'lucide-react';
import ContractForm from '@/components/forms/ContractForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { hrService, Contract, Employee } from '@/shared/api/hr';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

export default function ContratsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['contracts', typeFilter, searchQuery],
    queryFn: () =>
      hrService.getContracts({
        page: 1,
        limit: 200,
        contractType: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'for-contracts'],
    queryFn: () => hrService.getEmployees({ page: 1, pageSize: 200 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat supprimé');
    },
    onError: () => toast.error('Suppression impossible'),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => hrService.updateContract(id, { status: 'ACTIF', statut: 'ACTIF' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat validé');
    },
    onError: () => toast.error('Validation impossible'),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => hrService.terminateContract(id, new Date().toISOString().slice(0, 10)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrat terminé');
    },
    onError: () => toast.error('Action impossible'),
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => hrService.downloadContractPdf(id),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat-${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => toast.error('PDF indisponible'),
  });

  const contracts = contractsData?.data ?? [];
  const employees: Employee[] = employeesData?.data ?? [];

  const filteredContracts = useMemo(() => {
    return contracts.filter((c: Contract) => {
      const matchType = typeFilter === 'all' || c.contractType === typeFilter;
      const matchSearch =
        `${c.employee?.firstName ?? ''} ${c.employee?.lastName ?? ''} ${c.position ?? ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [contracts, typeFilter, searchQuery]);

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { className: string }> = {
      CDI: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      CDD: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      STAGE: { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      ALTERNANCE: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      FREELANCE: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    };
    const badge = badges[type] || badges.CDI;
    return <Badge className={badge.className}>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      ACTIF: { label: 'Actif', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      TERMINE: { label: 'Terminé', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      SUSPENDU: { label: 'Suspendu', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      RUPTURE: { label: 'Rupture', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    };
    const badge = badges[status] || badges.ACTIF;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Contrats</h1>
          <p className="text-muted-foreground mt-2">
            Contrats de travail et avenants
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouveau Contrat
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Contrats</p>
              <p className="text-2xl font-bold">{contracts.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CDI</p>
              <p className="text-2xl font-bold text-green-600">
                {contracts.filter((c: Contract) => c.contractType === 'CDI').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CDD / Stages</p>
              <p className="text-2xl font-bold text-blue-600">
                {contracts.filter((c: Contract) => ['CDD', 'STAGE', 'ALTERNANCE'].includes(c.contractType || '')).length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Actifs</p>
              <p className="text-2xl font-bold text-green-600">
                {contracts.filter((c: Contract) => c.status === 'ACTIF').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Rechercher un employé ou poste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
              <option value="ALTERNANCE">Alternance</option>
              <option value="FREELANCE">Freelance</option>
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
        ) : filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Poste</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Département</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Début</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Fin</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Salaire</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract: Contract) => (
                  <tr key={contract.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">
                      {contract.employee?.firstName ? `${contract.employee.firstName} ${contract.employee.lastName ?? ''}` : contract.employeeId}
                    </td>
                    <td className="py-3 px-4">{getTypeBadge(contract.contractType)}</td>
                    <td className="py-3 px-4">{contract.position}</td>
                    <td className="py-3 px-4">{contract.department}</td>
                    <td className="py-3 px-4">{contract.startDate ? new Date(contract.startDate).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="py-3 px-4">{getStatusBadge(contract.status)}</td>
                    <td className="py-3 px-4">{contract.salary?.toLocaleString()} {contract.currency}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadMutation.mutate(contract.id)}
                          disabled={downloadMutation.isPending}
                          title="Télécharger le PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {contract.status !== 'ACTIF' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600"
                            onClick={() => validateMutation.mutate(contract.id)}
                            disabled={validateMutation.isPending}
                          >
                            Valider
                          </Button>
                        )}
                        {contract.status === 'ACTIF' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-700"
                            onClick={() => terminateMutation.mutate(contract.id)}
                            disabled={terminateMutation.isPending}
                          >
                            Terminer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Supprimer ce contrat ?')) deleteMutation.mutate(contract.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucun contrat trouvé
            </p>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
          </DialogHeader>
          <ContractForm
            employees={employees}
            onSuccess={() => {
              setIsOpen(false);
              queryClient.invalidateQueries({ queryKey: ['contracts'] });
            }}
            onCancel={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
