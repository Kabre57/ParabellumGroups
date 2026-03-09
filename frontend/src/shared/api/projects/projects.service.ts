import { apiClient } from '../shared/client';
import { Project, ProjectStatus, PaginatedResponse } from '../shared/types';
import { ProjectData, Task, TaskData } from './types';

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
    return response.data;
  },

  async getProject(id: string): Promise<DetailResponse<Project>> {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
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
    return response.data;
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
    return response.data;
  },

  async getTask(id: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.get(`/projects/tasks/${id}`);
    return response.data;
  },

  async createTask(data: TaskData & { projectId: string }): Promise<DetailResponse<Task>> {
    const response = await apiClient.post('/projects/tasks', data);
    return response.data;
  },

  async updateTask(id: string, data: Partial<TaskData>): Promise<DetailResponse<Task>> {
    const response = await apiClient.put(`/projects/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/projects/tasks/${id}`);
    return response.data;
  },

  async assignTask(taskId: string, userId: string): Promise<DetailResponse<Task>> {
    const response = await apiClient.post(`/projects/tasks/${taskId}/assign`, { userId });
    return response.data;
  },

  async completeTask(taskId: string, actualHours?: number): Promise<DetailResponse<Task>> {
    const response = await apiClient.patch(`/projects/tasks/${taskId}/complete`, { actualHours });
    return response.data;
  },

  async getGlobalStats(): Promise<{ success: boolean; data: ProjectStats }> {
    const response = await apiClient.get('/projects/stats');
    return response.data;
  },
};

export * from './types';
