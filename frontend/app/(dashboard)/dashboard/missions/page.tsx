'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { technicalService, Mission } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS = {
  PENDING: 'warning',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
} as const;

const PRIORITY_COLORS = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
} as const;

export default function MissionsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['missions', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters.status) params.filters = { ...params.filters, status: filters.status };
      if (filters.priority) params.filters = { ...params.filters, priority: filters.priority };
      if (filters.search) params.query = filters.search;
      
      return await technicalService.getMissions(params);
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: '', priority: '', search: '' });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Missions
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gestion des missions techniques
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/missions/new')}>
          Nouvelle mission
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminée</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>
          <div>
            <select
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">Toutes les priorités</option>
              <option value="LOW">Basse</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Haute</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
          <div>
            <Button variant="outline" onClick={resetFilters} className="w-full">
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Missions table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Erreur lors du chargement des missions
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Date de début</TableHead>
                <TableHead>Techniciens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((mission: Mission) => (
                  <TableRow
                    key={mission.num}
                    onClick={() => router.push(`/dashboard/missions/${mission.num}`)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <TableCell className="font-medium">{mission.num}</TableCell>
                    <TableCell>{mission.title}</TableCell>
                    <TableCell>
                      {mission.location || 'Non spécifié'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_COLORS[
                            mission.status as keyof typeof STATUS_COLORS
                          ] || 'default'
                        }
                      >
                        {mission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mission.priority && (
                        <Badge
                          variant={
                            PRIORITY_COLORS[
                              mission.priority as keyof typeof PRIORITY_COLORS
                            ] || 'default'
                          }
                        >
                          {mission.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(mission.startDate), 'dd MMM yyyy', {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Aucune mission trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {data.pagination.currentPage} sur {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!data.pagination.hasPrevious}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={!data.pagination.hasNext}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
