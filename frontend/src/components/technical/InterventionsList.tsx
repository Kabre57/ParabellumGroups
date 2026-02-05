'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, InterventionDetailed } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { InterventionForm } from './InterventionForm';

const statusColors = {
  PLANIFIEE: 'bg-blue-100 text-blue-800',
  EN_COURS: 'bg-yellow-100 text-yellow-800',
  TERMINEE: 'bg-green-100 text-green-800',
  ANNULEE: 'bg-red-100 text-red-800',
};

const statusLabels = {
  PLANIFIEE: 'Planifiee',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  ANNULEE: 'Annulee',
};

export default function InterventionsList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [technicianFilter, setTechnicianFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['interventions', statusFilter, technicianFilter, dateFromFilter, dateToFilter],
    queryFn: () =>
      technicalService.getInterventions({
        filters: {
          status: statusFilter || undefined,
        },
        pageSize: 100,
      }),
  });

  const { data: techniciansData } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => technicalService.getTechniciens({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<InterventionDetailed>) => technicalService.createIntervention(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      setIsDialogOpen(false);
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const interventions = data ?? [];
  const technicians = techniciansData ?? [];

  const filteredInterventions = interventions.filter((intervention) => {
    const dateValue = intervention.dateDebut || intervention.scheduledDate || intervention.date;
    const matchesTechnician =
      !technicianFilter ||
      intervention.technician?.id === technicianFilter ||
      intervention.techniciens?.some(
        (t) => t.technicienId === technicianFilter || t.technicien?.id === technicianFilter
      );

    const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
    const toDate = dateToFilter ? new Date(dateToFilter) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const matchesFrom = !fromDate || (dateValue ? new Date(dateValue) >= fromDate : false);
    const matchesTo = !toDate || (dateValue ? new Date(dateValue) <= toDate : false);

    return matchesTechnician && matchesFrom && matchesTo;
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Chargement...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert className="bg-red-50 border-red-200 text-red-800">
          Erreur lors du chargement des interventions
        </Alert>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Interventions
          </h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            + Nouvelle intervention
          </Button>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="PLANIFIEE">Planifiee</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINEE">Terminee</option>
              <option value="ANNULEE">Annulee</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Technicien
            </label>
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
            >
              <option value="">Tous les techniciens</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date debut
            </label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date fin
            </label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Horaires
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Technicien
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Mission
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Duree
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInterventions.map((intervention) => {
                const dateValue = intervention.dateDebut || intervention.scheduledDate || intervention.date;
                const technicianLabel = intervention.technician
                  ? `${intervention.technician.firstName} ${intervention.technician.lastName}`
                  : intervention.techniciens?.[0]?.technicien
                  ? `${intervention.techniciens[0].technicien?.firstName ?? ''} ${intervention.techniciens[0].technicien?.lastName ?? ''}`.trim()
                  : '-';

                return (
                  <tr
                    key={intervention.id}
                    className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-3 px-4">
                      <span className="text-gray-900 dark:text-white">
                        {dateValue ? formatDate(dateValue) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatTime(intervention.startTime)}
                        {intervention.endTime && ` - ${formatTime(intervention.endTime)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-900 dark:text-white">
                        {technicianLabel || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {intervention.mission?.title || intervention.missionNum}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600 dark:text-gray-400">
                        {intervention.estimatedDuration
                          ? `${intervention.estimatedDuration}h (estime)`
                          : intervention.actualDuration
                          ? `${intervention.actualDuration}h`
                          : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          statusColors[intervention.status as keyof typeof statusColors] ||
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {statusLabels[intervention.status as keyof typeof statusLabels] || intervention.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredInterventions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune intervention trouvee
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Total: {filteredInterventions.length} intervention(s)
        </div>
      </Card>

      {isDialogOpen && (
        <InterventionForm
          onSubmit={(payload) => createMutation.mutate(payload)}
          onClose={handleCloseDialog}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}
