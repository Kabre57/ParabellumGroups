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
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
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
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
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

const projectStatusMap: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNING]: 'PLANIFIE',
  [ProjectStatus.ACTIVE]: 'EN_COURS',
  [ProjectStatus.ON_HOLD]: 'SUSPENDU',
  [ProjectStatus.COMPLETED]: 'TERMINE',
  [ProjectStatus.CANCELLED]: 'ANNULE',
};

const taskStatusMap: Record<string, string> = {
  TODO: 'A_FAIRE',
  IN_PROGRESS: 'EN_COURS',
  IN_REVIEW: 'EN_COURS',
  DONE: 'TERMINEE',
  BLOCKED: 'BLOQUEE',
  A_FAIRE: 'A_FAIRE',
  EN_COURS: 'EN_COURS',
  TERMINEE: 'TERMINEE',
  BLOQUEE: 'BLOQUEE',
};

const taskPriorityMap: Record<string, string> = {
  LOW: 'BASSE',
  MEDIUM: 'MOYENNE',
  HIGH: 'HAUTE',
  URGENT: 'CRITIQUE',
  BASSE: 'BASSE',
  MOYENNE: 'MOYENNE',
  HAUTE: 'HAUTE',
  CRITIQUE: 'CRITIQUE',
};

const mapProjectStatus = (status?: ProjectStatus): string | undefined => {
  if (!status) return undefined;
  return projectStatusMap[status] || status;
};

const mapTaskStatus = (status?: string): string | undefined => {
  if (!status) return undefined;
  return taskStatusMap[status] || status;
};

const mapTaskPriority = (priority?: string): string | undefined => {
  if (!priority) return undefined;
  return taskPriorityMap[priority] || priority;
};

const buildProjectPayload = (data: Partial<ProjectData>): Record<string, any> => {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.nom = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.customerId !== undefined) payload.clientId = data.customerId;
  if (data.startDate !== undefined) payload.dateDebut = data.startDate;
  if (data.endDate !== undefined) payload.dateFin = data.endDate;
  if (data.budget !== undefined) payload.budget = data.budget;
  if (data.status !== undefined) payload.status = mapProjectStatus(data.status);
  if (data.priority !== undefined) payload.priorite = mapTaskPriority(data.priority);

  return payload;
};

const buildTaskPayload = (data: Partial<TaskData>): Record<string, any> => {
  const payload: Record<string, any> = {};

  if (data.title !== undefined) payload.titre = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.startDate !== undefined) payload.dateDebut = data.startDate;
  if (data.dueDate !== undefined) payload.dateEcheance = data.dueDate;
  if (data.estimatedHours !== undefined) payload.dureeEstimee = data.estimatedHours;
  if (data.actualHours !== undefined) payload.dureeReelle = data.actualHours;
  if (data.status !== undefined) payload.status = mapTaskStatus(data.status);
  if (data.priority !== undefined) payload.priorite = mapTaskPriority(data.priority);

  return payload;
};

const buildProjectQueryParams = (params?: ProjectParams): Record<string, any> | undefined => {
  if (!params) return undefined;
  const mapped: Record<string, any> = {};

  if (params.page !== undefined) mapped.page = params.page;
  if (params.pageSize !== undefined) mapped.limit = params.pageSize;
  if (params.status !== undefined) mapped.status = mapProjectStatus(params.status);
  if (params.customerId !== undefined) mapped.clientId = params.customerId;
  if (params.query !== undefined) mapped.query = params.query;

  return mapped;
};

const buildTaskQueryParams = (params?: TaskParams): Record<string, any> | undefined => {
  if (!params) return undefined;
  const mapped: Record<string, any> = {};

  if (params.page !== undefined) mapped.page = params.page;
  if (params.pageSize !== undefined) mapped.limit = params.pageSize;
  if (params.status !== undefined) mapped.status = mapTaskStatus(params.status);
  if (params.priority !== undefined) mapped.priorite = mapTaskPriority(params.priority);
  if (params.assignedToId !== undefined) mapped.userId = params.assignedToId;
  if (params.query !== undefined) mapped.query = params.query;

  return mapped;
};

const projectStatusReverseMap: Record<string, ProjectStatus> = {
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

const backendTaskStatusMap: Record<string, Task['status']> = {
  A_FAIRE: 'TODO',
  EN_COURS: 'IN_PROGRESS',
  TERMINEE: 'DONE',
  BLOQUEE: 'BLOCKED',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

const backendTaskPriorityMap: Record<string, Task['priority']> = {
  BASSE: 'LOW',
  MOYENNE: 'MEDIUM',
  HAUTE: 'HIGH',
  CRITIQUE: 'URGENT',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

const mapBackendProjectStatus = (status?: string): ProjectStatus => {
  if (!status) return ProjectStatus.PLANNING;
  return projectStatusReverseMap[status] || ProjectStatus.PLANNING;
};

const mapBackendTaskStatus = (status?: string): Task['status'] => {
  if (!status) return 'TODO';
  return backendTaskStatusMap[status] || 'TODO';
};

const mapBackendTaskPriority = (priority?: string): Task['priority'] => {
  if (!priority) return 'MEDIUM';
  return backendTaskPriorityMap[priority] || 'MEDIUM';
};

const toNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const computeCompletion = (tasks?: Array<{ status?: string }>): number | undefined => {
  if (!tasks || tasks.length === 0) return 0;
  const total = tasks.length;
  const done = tasks.filter((task) => mapBackendTaskStatus(task.status) === 'DONE').length;
  return Math.round((done / total) * 100);
};

const normalizeProject = (raw: any): Project => {
  const source = raw || {};
  const completion = computeCompletion(source.taches);

  const priorityValue = source.priorite ?? source.priority;

  return {
    id: source.id,
    projectNumber: source.numeroProjet ?? source.projectNumber,
    name: source.nom ?? source.name ?? '',
    description: source.description ?? undefined,
    customerId: source.clientId ?? source.customerId ?? '',
    customer: source.customer,
    clientName: source.clientName ?? source.client?.nom ?? source.client?.name,
    status: mapBackendProjectStatus(source.status),
    startDate: source.dateDebut ?? source.startDate ?? '',
    endDate: source.dateFin ?? source.endDate ?? undefined,
    budget: toNumber(source.budget),
    spent: toNumber(source.coutReel),
    completion,
    currency: source.currency ?? 'XOF',
    priority: priorityValue ? mapBackendTaskPriority(priorityValue) : undefined,
    managerId: source.managerId ?? '',
    manager: source.manager,
    createdAt: source.createdAt ?? '',
    updatedAt: source.updatedAt ?? '',
  };
};

const normalizeTask = (raw: any): Task => {
  const source = raw || {};
  const assignedToId = source.assignedToId ?? source.assignations?.[0]?.userId;

  return {
    id: source.id,
    projectId: source.projetId ?? source.projectId ?? '',
    title: source.titre ?? source.title ?? '',
    description: source.description ?? undefined,
    status: mapBackendTaskStatus(source.status),
    priority: mapBackendTaskPriority(source.priorite ?? source.priority),
    assignedToId,
    assignedTo: source.assignedTo ?? source.assignations?.[0]?.user,
    dueDate: source.dateEcheance ?? source.dueDate ?? undefined,
    estimatedHours: toNumber(source.dureeEstimee ?? source.estimatedHours),
    actualHours: toNumber(source.dureeReelle ?? source.actualHours),
    tags: source.tags ?? [],
    createdAt: source.createdAt ?? '',
    updatedAt: source.updatedAt ?? '',
  };
};

const normalizePagination = (pagination: any, count: number) => {
  const totalItems = toNumber(pagination?.total) ?? count;
  const pageSize = toNumber(pagination?.limit) ?? count;
  const currentPage = toNumber(pagination?.page) ?? 1;
  const totalPages = toNumber(pagination?.totalPages) ?? (pageSize ? Math.ceil(totalItems / pageSize) : 1);

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
};

const wrapApiResponse = <T>(status: number, data: T, message = 'OK'): ApiResponse<T> => ({
  success: status >= 200 && status < 300,
  message,
  status,
  data,
});

const notImplementedResponse = <T>(data: T, message: string): ApiResponse<T> => (
  wrapApiResponse(501, data, message)
);

/**
 * Service API pour la gestion des projets
 */
export const projectsService = {
  /**
   * Récupère la liste des projets avec pagination et filtres
   */
  async getProjects(params?: ProjectParams): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const response = await apiClient.getAxiosInstance().get('/projects', { params: buildProjectQueryParams(params) });
    const raw = response.data || {};
    const payload = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw;
    const items = Array.isArray(payload.projets) ? payload.projets : Array.isArray(payload.data) ? payload.data : [];
    const data: PaginatedResponse<Project> = {
      data: items.map(normalizeProject),
      pagination: normalizePagination(payload.pagination ?? raw.pagination, items.length),
    };
    return wrapApiResponse(response.status, data);
  },

  /**
   * Récupère un projet par son ID
   */
  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().get(`/projects/${id}`);
    const raw = response.data?.data ?? response.data;
    return wrapApiResponse(response.status, normalizeProject(raw));
  },

  /**
   * Crée un nouveau projet
   */
  async createProject(data: ProjectData): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().post('/projects', buildProjectPayload(data));
    const raw = response.data?.data ?? response.data;
    return wrapApiResponse(response.status, normalizeProject(raw));
  },

  /**
   * Met à jour un projet existant
   */
  async updateProject(id: string, data: Partial<ProjectData>): Promise<ApiResponse<Project>> {
    const response = await apiClient.getAxiosInstance().put(`/projects/${id}`, buildProjectPayload(data));
    const raw = response.data?.data ?? response.data;
    return wrapApiResponse(response.status, normalizeProject(raw));
  },

  /**
   * Supprime un projet
   */
  async deleteProject(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.getAxiosInstance().delete(`/projects/${id}`);
    return wrapApiResponse(response.status, undefined as void);
  },

  /**
   * Récupère les tâches d'un projet avec pagination et filtres
   */
  async getTasks(projectId: string, params?: TaskParams): Promise<ApiResponse<PaginatedResponse<Task>>> {
    const response = await apiClient.getAxiosInstance().get(`/projects/${projectId}/tasks`, {
      params: buildTaskQueryParams(params),
    });
    const raw = response.data || {};
    const payload = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw;
    const items = Array.isArray(payload.taches) ? payload.taches : Array.isArray(payload.data) ? payload.data : [];
    const data: PaginatedResponse<Task> = {
      data: items.map(normalizeTask),
      pagination: normalizePagination(payload.pagination ?? raw.pagination, items.length),
    };
    return wrapApiResponse(response.status, data);
  },

  /**
   * Crée une nouvelle tâche dans un projet
   */
  async createTask(projectId: string, data: TaskData): Promise<ApiResponse<Task>> {
    const response = await apiClient.getAxiosInstance().post(`/projects/${projectId}/tasks`, {
      ...buildTaskPayload(data),
      projetId: projectId,
    });
    const raw = response.data?.data ?? response.data;
    return wrapApiResponse(response.status, normalizeTask(raw));
  },

  /**
   * Met à jour une tâche existante
   */
  async updateTask(projectId: string, taskId: string, data: Partial<TaskData>): Promise<ApiResponse<Task>> {
    const response = await apiClient.getAxiosInstance().put(`/projects/${projectId}/tasks/${taskId}`, buildTaskPayload(data));
    const raw = response.data?.data ?? response.data;
    return wrapApiResponse(response.status, normalizeTask(raw));
  },

  /**
   * Enregistre du temps de travail (timesheet)
   */
  async logTime(data: TimeLogData): Promise<ApiResponse<TimeEntry>> {
    return notImplementedResponse(null as unknown as TimeEntry, 'Le suivi des temps n\'est pas encore disponible');
  },

  /**
   * Récupère les entrées de temps d'un projet
   */
  async getTimeEntries(projectId: string, params?: SearchParams): Promise<ApiResponse<PaginatedResponse<TimeEntry>>> {
    return notImplementedResponse(
      {
        data: [],
        pagination: normalizePagination(undefined, 0),
      },
      'Le suivi des temps n\'est pas encore disponible'
    );
  },

  /**
   * Crée un événement de calendrier
   */
  async createCalendarEvent(data: CalendarEventData): Promise<ApiResponse<CalendarEvent>> {
    return notImplementedResponse(null as unknown as CalendarEvent, 'Le calendrier projet n\'est pas encore disponible');
  },

  /**
   * Récupère les événements du calendrier avec filtres
   */
  async getCalendarEvents(params?: CalendarEventParams): Promise<ApiResponse<PaginatedResponse<CalendarEvent>>> {
    return notImplementedResponse({
      data: [],
      pagination: normalizePagination(undefined, 0),
    }, 'Le calendrier projet n\'est pas encore disponible');
  },
};

export default projectsService;

