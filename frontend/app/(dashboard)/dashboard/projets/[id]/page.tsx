'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects';
import { TaskBoard } from '@/components/projects/TaskBoard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

interface ProjectDetailsProps {
  params: {
    id: string;
  };
}

type TabType = 'info' | 'tasks' | 'time' | 'documents';

interface TimesheetEntry {
  id: string;
  date: string;
  user: string;
  task: string;
  hours: number;
  description: string;
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export default function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const { canUpdate, canCreate, canExport } = getCrudVisibility(user, {
    read: ['projects.read', 'projects.read_all', 'projects.read_assigned'],
    create: ['attendance.create'],
    update: ['projects.update', 'projects.manage_budget', 'projects.manage_team', 'projects.change_status'],
    export: ['projects.update', 'projects.manage_team'],
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => projectsService.getProject(params.id),
  });

  const project = response?.data;
  const timeEntries: TimesheetEntry[] = [];
  const documents: DocumentItem[] = [];

  if (isLoading || !project) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  const budgetValue = project.budget ?? 0;
  const spentValue = project.spent ?? 0;
  const completion = project.completion ?? 0;
  const budgetUsage = budgetValue > 0 ? Math.round((spentValue / budgetValue) * 100) : 0;
  const projectNumber = project.projectNumber || project.id.slice(0, 8);
  const clientLabel = project.clientName || project.customer?.companyName || project.customerId || '-';
  const startDateLabel = project.startDate ? new Date(project.startDate).toLocaleDateString() : '-';
  const endDateLabel = project.endDate ? new Date(project.endDate).toLocaleDateString() : '-';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/projets" className="text-gray-500 hover:text-gray-700">
              Retour
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-600">{projectNumber} - {clientLabel}</p>
        </div>
        {canUpdate && (
          <Button>Modifier</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Budget" value={`${budgetValue.toLocaleString()} F`} />
        <MetricCard label="Depense" value={`${spentValue.toLocaleString()} F`} accent="text-orange-600" />
        <MetricCard label="Restant" value={`${(budgetValue - spentValue).toLocaleString()} F`} accent="text-green-600" />
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              ['info', 'Informations'],
              ['tasks', 'Taches'],
              ['time', 'Temps'],
              ['documents', 'Documents'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-semibold">Description</h3>
                <p className="text-gray-700">{project.description || 'Aucune description.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoBlock label="Date de debut" value={startDateLabel} />
                <InfoBlock label="Date de fin" value={endDateLabel} />
                <InfoBlock label="Statut" value={project.status} />
                <InfoBlock label="Completion" value={`${completion}%`} />
                <InfoBlock label="Budget consomme" value={`${budgetUsage}%`} />
                <InfoBlock label="Manager" value={project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : project.managerId} />
              </div>
            </div>
          )}

          {activeTab === 'tasks' && <TaskBoard projectId={params.id} />}

          {activeTab === 'time' && (
            <div className="space-y-4">
              <div className="rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
                Le suivi des temps n'est pas encore connecte au backend.
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Feuilles de temps</h3>
                {canCreate && <Button>Ajouter une entree</Button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tache</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {timeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{entry.user}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{entry.task}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{entry.hours}h</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {timeEntries.length === 0 && <div className="py-8 text-center text-gray-500">Aucune entree de temps</div>}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
                La gestion des documents n'est pas encore connectee au backend.
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents</h3>
                {canUpdate && <Button>Telecharger un document</Button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ajoute par</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{doc.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{doc.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{(doc.size / 1024).toFixed(2)} KB</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{doc.uploadedBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {canExport && (
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                              Telecharger
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documents.length === 0 && <div className="py-8 text-center text-gray-500">Aucun document</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-bold ${accent || ''}`}>{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-gray-600">{label}</h3>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
