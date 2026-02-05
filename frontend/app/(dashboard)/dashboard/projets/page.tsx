'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects';
import type { ApiResponse, PaginatedResponse, Project, ProjectStatus } from '@/shared/api/types';

const statusColors: Record<ProjectStatus, string> = {
  PLANNING: 'bg-gray-200 text-gray-800',
  ACTIVE: 'bg-blue-200 text-blue-800',
  ON_HOLD: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-green-200 text-green-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: 'Planifié',
  ACTIVE: 'En cours',
  ON_HOLD: 'Suspendu',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');

  const { data: response, isLoading } = useQuery<ApiResponse<PaginatedResponse<Project>>>({
    queryKey: ['projects', statusFilter, clientFilter],
    queryFn: () =>
      projectsService.getProjects({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
  });

  const projects = response?.data.data ?? [];

  const filteredProjects = projects.filter((project) => {
    const clientLabel = (project.clientName || project.customer?.name || project.customerId || '').toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const matchesClient = !clientFilter || clientLabel.includes(clientFilter.toLowerCase());
    return matchesStatus && matchesClient;
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === ProjectStatus.ACTIVE).length,
    completed: projects.filter((p) => p.status === ProjectStatus.COMPLETED).length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projets</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Nouveau projet
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Actifs</div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Terminés</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Budget total</div>
          <div className="text-2xl font-bold">{stats.totalBudget.toLocaleString()} F</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous</option>
              <option value="PLANNING">Planifié</option>
              <option value="ACTIVE">En cours</option>
              <option value="ON_HOLD">Suspendu</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <input
              type="text"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progression</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => {
                  const projectNumber = project.projectNumber || project.id.slice(0, 8);
                  const clientLabel = project.clientName || project.customer?.name || project.customerId || '—';
                  const startDateLabel = project.startDate ? new Date(project.startDate).toLocaleDateString() : '—';
                  const endDateLabel = project.endDate ? new Date(project.endDate).toLocaleDateString() : '—';
                  const budgetValue = project.budget ?? 0;
                  const completion = project.completion ?? 0;

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{projectNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{clientLabel}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {startDateLabel} - {endDateLabel}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{budgetValue.toLocaleString()} F</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${completion}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">{completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/dashboard/projets/${project.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Voir
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun projet trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
