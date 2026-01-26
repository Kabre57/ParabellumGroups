import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, SearchParams, Project, ProjectStatus } from '../types';

/**
 * Tâche d'un projet
 */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Entrée de temps (timesheet)
 */
export interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  hours: number;
  description?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  billable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Événement de calendrier
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: Project;
  taskId?: string;
  task?: Task;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  attendees?: string[];
  type: 'MEETING' | 'DEADLINE' | 'MILESTONE' | 'REMINDER' | 'OTHER';
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paramètres de filtrage pour les projets
 */
export interface ProjectParams extends SearchParams {
  status?: ProjectStatus;
  customerId?: string;
  managerId?: string;
  startDateAfter?: string;
  startDateBefore?: string;
  endDateAfter?: string;
  endDateBefore?: string;
}

/**
 * Paramètres de filtrage pour les tâches
 */
export interface TaskParams extends SearchParams {
  status?: string;
  priority?: string;
  assignedToId?: string;
  dueDateAfter?: string;
  dueDateBefore?: string;
  tags?: string[];
}

/**
 * Paramètres de filtrage pour les événements de calendrier
 */
export interface CalendarEventParams extends SearchParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  type?: string;
  attendeeId?: string;
}

/**
 * Données pour créer/mettre à jour un projet
 */
export interface ProjectData {
  name: string;
  description?: string;
  customerId: string;
  status?: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  managerId: string;
}

/**
 * Données pour créer/mettre à jour une tâche
 */
export interface TaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
}

/**
 * Données pour logger du temps
 */
export interface TimeLogData {
  projectId: string;
  taskId?: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
  billable?: boolean;
}

/**
 * Données pour créer/mettre à jour un événement de calendrier
 */
export interface CalendarEventData {
  title: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
  type?: string;
  color?: string;
}

/**
 * Service API pour la gestion des projets
 */
export const projectsService = {
  /**
   * Récupère la liste des projets avec pagination et filtres
   */
  async getProjects(params?: ProjectParams): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const response = await apiClient.getAxiosInstance().get('/projects', { params });
    return response.data;
  },

  /**
   * Récupère un projet par son ID
   */
  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().get(`/projects/${id}`);
    return response.data;
  },

  /**
   * Crée un nouveau projet
   */
  async createProject(data: ProjectData): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().post('/projects', data);
    return response.data;
  },

  /**
   * Met à jour un projet existant
   */
  async updateProject(id: string, data: Partial<ProjectData>): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().patch(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un projet
   */
  async deleteProject(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.getAxiosInstance().delete(`/projects/${id}`);
    return response.data;
  },

  /**
   * Récupère les tâches d'un projet avec pagination et filtres
   */
  async getTasks(projectId: string, params?: TaskParams): Promise<ApiResponse<PaginatedResponse<Task>>> {
    const response = await apiClient.getAxiosInstance().get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  },

  /**
   * Crée une nouvelle tâche dans un projet
   */
  async createTask(projectId: string, data: TaskData): Promise<ApiResponse<Task>> {
    const response = await apiClient.getAxiosInstance().post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  /**
   * Met à jour une tâche existante
   */
  async updateTask(taskId: string, data: Partial<TaskData>): Promise<ApiResponse<Task>> {
    const response = await apiClient.getAxiosInstance().patch(`/tasks/${taskId}`, data);
    return response.data;
  },

  /**
   * Enregistre du temps de travail (timesheet)
   */
  async logTime(data: TimeLogData): Promise<ApiResponse<TimeEntry>> {
    const response = await apiClient.getAxiosInstance().post('/time-entries', data);
    return response.data;
  },

  /**
   * Récupère les entrées de temps d'un projet
   */
  async getTimeEntries(projectId: string, params?: SearchParams): Promise<ApiResponse<PaginatedResponse<TimeEntry>>> {
    const response = await apiClient.getAxiosInstance().get(`/projects/${projectId}/time-entries`, { params });
    return response.data;
  },

  /**
   * Crée un événement de calendrier
   */
  async createCalendarEvent(data: CalendarEventData): Promise<ApiResponse<CalendarEvent>> {
    const response = await apiClient.getAxiosInstance().post('/calendar/events', data);
    return response.data;
  },

  /**
   * Récupère les événements du calendrier avec filtres
   */
  async getCalendarEvents(params?: CalendarEventParams): Promise<ApiResponse<PaginatedResponse<CalendarEvent>>> {
    const response = await apiClient.getAxiosInstance().get('/calendar/events', { params });
    return response.data;
  },
};

export default projectsService;
