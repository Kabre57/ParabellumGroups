'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Eye, Download } from 'lucide-react';

interface Contract {
  id: string;
  employee: string;
  type: 'CDI' | 'CDD' | 'Stage' | 'Alternance' | 'Freelance';
  position: string;
  startDate: string;
  endDate?: string;
  salary: number;
  status: 'active' | 'pending' | 'expired' | 'terminated';
  department: string;
}

export default function ContratsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      return [
        { id: '1', employee: 'Jean Dupont', type: 'CDI', position: 'Technicien Chef', startDate: '2024-01-15', salary: 3500, status: 'active', department: 'Technique' },
        { id: '2', employee: 'Marie Martin', type: 'CDI', position: 'Commerciale Senior', startDate: '2023-06-01', salary: 3200, status: 'active', department: 'Commercial' },
        { id: '3', employee: 'Pierre Durant', type: 'CDD', position: 'Technicien', startDate: '2025-09-01', endDate: '2026-08-31', salary: 2800, status: 'active', department: 'Technique' },
        { id: '4', employee: 'Sophie Lambert', type: 'Alternance', position: 'Assistante RH', startDate: '2025-09-01', endDate: '2026-08-31', salary: 1200, status: 'active', department: 'Administration' },
        { id: '5', employee: 'Lucas Bernard', type: 'Stage', position: 'Stagiaire Marketing', startDate: '2026-01-15', endDate: '2026-06-30', salary: 600, status: 'pending', department: 'Marketing' },
      ];
    },
  });

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { className: string }> = {
      CDI: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      CDD: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      Stage: { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      Alternance: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      Freelance: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    };
    const badge = badges[type] || badges.CDI;
    return <Badge className={badge.className}>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: { label: 'Actif', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      expired: { label: 'Expiré', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      terminated: { label: 'Résilié', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredContracts = contracts?.filter(contract => {
    const matchesSearch = contract.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || contract.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Contrats</h1>
          <p className="text-muted-foreground mt-2">
            Contrats de travail et avenants
          </p>
        </div>
        <Button className="flex items-center gap-2">
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
              <p className="text-2xl font-bold">{contracts?.length || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CDI</p>
              <p className="text-2xl font-bold text-green-600">
                {contracts?.filter(c => c.type === 'CDI').length || 0}
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
                {contracts?.filter(c => c.type === 'CDD' || c.type === 'Stage' || c.type === 'Alternance').length || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Masse Salariale</p>
              <p className="text-2xl font-bold text-purple-600">
                {contracts?.reduce((sum, c) => sum + c.salary, 0).toLocaleString()}F
              </p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un contrat..."
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les types</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Stage">Stage</option>
            <option value="Alternance">Alternance</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>
      </Card>

      {/* Contracts Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Poste</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Département</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Début</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Fin</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Salaire</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts?.map((contract) => (
                  <tr key={contract.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">{contract.employee}</td>
                    <td className="py-3 px-4">{contract.position}</td>
                    <td className="py-3 px-4">{getTypeBadge(contract.type)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{contract.department}</td>
                    <td className="py-3 px-4 text-sm">{new Date(contract.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4 text-sm">
                      {contract.endDate ? new Date(contract.endDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">{contract.salary.toLocaleString()}F</td>
                    <td className="py-3 px-4">{getStatusBadge(contract.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
