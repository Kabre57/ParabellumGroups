'use client';

import { useQuery } from '@tanstack/react-query';
import { projectsService, Task } from '@/shared/api/projects';
import type { ApiResponse, PaginatedResponse } from '@/shared/api/types';

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

interface TaskBoardProps {
  projectId: string;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-200 text-gray-800',
  MEDIUM: 'bg-yellow-200 text-yellow-800',
  HIGH: 'bg-red-200 text-red-800',
  URGENT: 'bg-red-600 text-white',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Critique',
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  IN_REVIEW: 'En revue',
  DONE: 'Terminé',
  BLOCKED: 'Bloqué',
};

export function TaskBoard({ projectId }: TaskBoardProps) {
  const { data: response, isLoading } = useQuery<ApiResponse<PaginatedResponse<Task>>>({
    queryKey: ['project-tasks', projectId],
    queryFn: () => projectsService.getTasks(projectId),
  });

  const tasks = response?.data.data ?? [];

  const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tableau des tâches</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Nouvelle tâche
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((status) => {
          const columnTasks = getTasksByStatus(status);
          return (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700">{statusLabels[status]}</h4>
                <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTasks.map((task) => {
                  const assignee =
                    task.assignedTo
                      ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                      : task.assignedToId || 'Non assigné';
                  const dueDateLabel = task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : '—';

                  return (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{task.title}</h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{assignee}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${isOverdue(task.dueDate) && status !== 'DONE' ? 'text-red-600 font-medium' : ''}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{dueDateLabel}</span>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Aucune tâche
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
