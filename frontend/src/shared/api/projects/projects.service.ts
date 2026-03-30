import { apiClient } from '../shared/client';
import { Project, ProjectStatus, PaginatedResponse } from '../shared/types';
import { ProjectData, Task, TaskData } from './types';

const projectStatusMap: Record<string, ProjectStatus> = {
  PLANIFIE: ProjectStatus.PLANNING,
  EN_COURS: ProjectStatus.ACTIVE,
  SUSPENDU: ProjectStatus.ON_HOLD,
  TERMINE: ProjectStatus.COMPLETED,
  ANNULE: ProjectStatus.CANCELLED,
  PLANNING: ProjectStatus.PLANNING,
  ACTIVE: ProjectStatus.ACTIVE,
  ON_HOLD: ProjectStatus.ON_HOLD,
  COMPLETED: ProjectStatus.COMPLETED,
  CANCELLED: ProjectStatus.CANCELLED,
};

const taskStatusMap: Record<string, Task['status']> = {
  A_FAIRE: 'TODO',
  EN_COURS: 'IN_PROGRESS',
  TERMINEE: 'DONE',
  BLOQUEE: 'BLOCKED',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

const taskPriorityMap: Record<string, Task['priority']> = {
  BASSE: 'LOW',
  MOYENNE: 'MEDIUM',
  HAUTE: 'HIGH',
  CRITIQUE: 'URGENT',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

const normalizePagination = (meta?: any) =>
  meta?.pagination
    ? {
        total: Number(meta.pagination.total || 0),
        page: Number(meta.pagination.page || 1),
        limit: Number(meta.pagination.limit || 10),
        totalPages: Number(meta.pagination.totalPages || 1),
      }
    : undefined;

const normalizeProject = (payload: any): Project => ({
  id: payload.id,
  projectNumber: payload.projectNumber || payload.numeroProjet || payload.id,
  name: payload.name || payload.nom || 'Projet',
  description: payload.description || undefined,
  customerId: payload.customerId || payload.clientId || '',
  clientName: payload.clientName || payload.client?.nom || undefined,
  status: projectStatusMap[payload.status] || ProjectStatus.PLANNING,
  startDate: payload.startDate || payload.dateDebut || payload.createdAt,
  endDate: payload.endDate || payload.dateFin || undefined,
  budget: Number(payload.budget || 0),
  spent: Number(payload.spent || payload.coutReel || 0),
  completion: Number(payload.completion || payload.progression?.pourcentage || 0),
  currency: payload.currency || 'XOF',
  priority: payload.priority || payload.priorite || undefined,
  managerId: payload.managerId || '',
  createdAt: payload.createdAt,
  updatedAt: payload.updatedAt,
});

const normalizeTask = (payload: any): Task => ({
  id: payload.id,
  projectId: payload.projectId || payload.projetId || '',
  title: payload.title || payload.titre || 'Tâche',
  description: payload.description || undefined,
  status: taskStatusMap[payload.status] || 'TODO',
  priority: taskPriorityMap[payload.priority || payload.priorite] || 'MEDIUM',
  assignedToId: payload.assignedToId || payload.assignations?.[0]?.userId || undefined,
  dueDate: payload.dueDate || payload.dateEcheance || undefined,
  estimatedHours: payload.estimatedHours ?? payload.dureeEstimee ?? undefined,
  actualHours: payload.actualHours ?? payload.dureeReelle ?? undefined,
  createdAt: payload.createdAt,
  updatedAt: payload.updatedAt,
});

const normalizeListResponse = <T>(payload: any, mapper: (value: any) => T): ListResponse<T> => {
  if (Array.isArray(payload?.data)) {
    return {
      success: payload.success ?? true,
      data: payload.data.map(mapper),
      meta: payload.meta ?? (payload.pagination ? { pagination: payload.pagination } : undefined),
    };
  }

  if (Array.isArray(payload?.projets)) {
    return {
      success: true,
      data: payload.projets.map(mapper),
      meta: { pagination: normalizePagination(payload.pagination) },
    };
  }

  if (Array.isArray(payload?.taches)) {
    return {
      success: true,
      data: payload.taches.map(mapper),
      meta: { pagination: normalizePagination(payload.pagination) },
    };
  }

  if (Array.isArray(payload)) {
    return { success: true, data: payload.map(mapper) };
  }

  return { success: payload?.success ?? true, data: [] };
};

const normalizeDetailResponse = <T>(payload: any, mapper: (value: any) => T): DetailResponse<T> => {
  if (payload?.data) {
    return {
      success: payload.success ?? true,
      data: mapper(payload.data),
      message: payload.message,
    };
  }

  return {
    success: true,
    data: mapper(payload),
  };
};

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProjectStats {
  totalProjects: number;
  projectsEnCours: number;
  projectsTermines: number;
  budgetTotal: number;
  budgetConsomme: number;
  tauxCompletion: number;
}

export const projectsService = {
  async getProjects(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: ProjectStatus;
    managerId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Project>> {
    const response = await apiClient.get('/projects', { params });
    return normalizeListResponse<Project>(response.data, normalizeProject);
  },

  async getProject(id: string): Promise<DetailResponse<Project>> {
    const response = await apiClient.get(`/projects/${id}`);
    return normalizeDetailResponse<Project>(response.data, normalizeProject);
  },

  async getProjectStats(id: string): Promise<{ success: boolean; data: ProjectStats }> {
    const response = await apiClient.get(`/projects/${id}/stats`);
    return response.data;
  },

  async createProject(data: ProjectData): Promise<DetailResponse<Project>> {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  async updateProject(id: string, data: Partial<ProjectData>): Promise<DetailResponse<Project>> {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  async getProjectTasks(projectId: string, params?: {
    status?: string;
    assignedToId?: string;
    priority?: string;
  }): Promise<ListResponse<Task>> {
    const response = await apiClient.get(`/projects/${projectId}/tasks`, { params });
    return normalizeListResponse<Task>(response.data, normalizeTask);
  },

  async createProjectTask(projectId: string, data: TaskData): Promise<DetailResponse<Task>> {
    const response = await apiClient.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  async getTasks(params?: {
    page?: number;
    limit?: number;
    projectId?: string;
    assignedToId?: string;
    status?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Task>> {
    const response = await apiClient.get('/projects/tasks', { params });
    return normalizeListResponse<Task>(response.data, normalizeTask);
  },

  async getTask(id: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.get(`/projects/tasks/${id}`);
    return normalizeDetailResponse<Task>(response.data, normalizeTask);
  },

  async createTask(data: TaskData & { projectId: string }): Promise<DetailResponse<Task>> {
    const response = await apiClient.post('/projects/tasks', data);
    return normalizeDetailResponse<Task>(response.data, normalizeTask);
  },

  async updateTask(id: string, data: Partial<TaskData>): Promise<DetailResponse<Task>> {
    const response = await apiClient.put(`/projects/tasks/${id}`, data);
    return normalizeDetailResponse<Task>(response.data, normalizeTask);
  },

  async deleteTask(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/tasks/${id}`);
    return response.data;
  },

  async assignTask(taskId: string, userId: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.post(`/projects/tasks/${taskId}/assign`, { userId });
    return normalizeDetailResponse<Task>(response.data, normalizeTask);
  },

  async completeTask(taskId: string, actualHours?: number): Promise<DetailResponse<Task>> {
    const response = await apiClient.patch(`/projects/tasks/${taskId}/complete`, { actualHours });
    return normalizeDetailResponse<Task>(response.data, normalizeTask);
  },

  async getGlobalStats(): Promise<{ success: boolean; data: ProjectStats }> {
    const response = await apiClient.get('/projects/stats');
    return response.data;
  },
};

export * from './types';
