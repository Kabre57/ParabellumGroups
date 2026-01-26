'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects';
import { TaskBoard } from '@/components/projects/TaskBoard';

interface ProjectDetailsProps {
  params: {
    id: string;
  };
}

type TabType = 'info' | 'tasks' | 'time' | 'documents';

interface ProjectDetails {
  id: string;
  number: string;
  name: string;
  description: string;
  clientName: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  status: string;
  completion: number;
}

interface TimesheetEntry {
  id: string;
  date: string;
  user: string;
  task: string;
  hours: number;
  description: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export default function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const { data: project, isLoading } = useQuery<ProjectDetails>({
    queryKey: ['project', params.id],
    queryFn: () => projectsService.getById(params.id),
  });

  const { data: timeEntries = [] } = useQuery<TimesheetEntry[]>({
    queryKey: ['project-time', params.id],
    queryFn: () => projectsService.getTimeEntries(params.id),
    enabled: activeTab === 'time',
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['project-documents', params.id],
    queryFn: () => projectsService.getDocuments(params.id),
    enabled: activeTab === 'documents',
  });

  if (isLoading || !project) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  const budgetUsage = (project.spent / project.budget) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/projets" className="text-gray-500 hover:text-gray-700">
              ← Retour
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
          <p className="text-gray-600">{project.number} - {project.clientName}</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Modifier
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Budget</div>
          <div className="text-2xl font-bold">{project.budget.toLocaleString()} F</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Dépensé</div>
          <div className="text-2xl font-bold text-orange-600">{project.spent.toLocaleString()} F</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Restant</div>
          <div className="text-2xl font-bold text-green-600">{(project.budget - project.spent).toLocaleString()} F</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Informations
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tâches
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'time'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Temps
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{project.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Date de début</h3>
                  <p className="text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Date de fin</h3>
                  <p className="text-gray-900">{new Date(project.endDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Progression</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${project.completion}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12">{project.completion}%</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Utilisation du budget</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${budgetUsage > 90 ? 'bg-red-600' : budgetUsage > 75 ? 'bg-orange-600' : 'bg-green-600'}`}
                      style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12">{budgetUsage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskBoard projectId={params.id} />
          )}

          {activeTab === 'time' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Feuilles de temps</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Ajouter une entrée
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tâche</th>
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
                {timeEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Aucune entrée de temps</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Documents</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Télécharger un document
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ajouté par</th>
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
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Télécharger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Aucun document</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
