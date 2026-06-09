import { apiClient } from '../shared/client';

export interface Evaluation {
  id: string;
  employeId: string;
  employe?: {
    id: string;
    nom: string;
    prenom: string;
    matricule?: string;
    poste?: string;
  };
  evaluateurId: string;
  evaluateur?: {
    id: string;
    nom: string;
    prenom: string;
  };
  dateEvaluation: string;
  periode: string;
  noteGlobale: number;
  competences?: any;
  objectifs?: any;
  pointsForts?: string;
  pointsAmeliorer?: string;
  planAction?: string;
  commentaireEmploye?: string;
  commentaireEvaluateur?: string;
  status: 'BROUILLON' | 'EN_COURS' | 'TERMINE' | 'VALIDE';
  createdAt?: string;
  updatedAt?: string;
}

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

export interface CreateEvaluationRequest {
  employeId: string;
  evaluateurId: string;
  dateEvaluation: string;
  periode: string;
  noteGlobale: number;
  competences?: any;
  objectifs?: any;
  commentaires?: string;
  pointsForts?: string;
  pointsAmeliorer?: string;
  planAction?: string;
}

export interface UpdateEvaluationRequest {
  dateEvaluation?: string;
  periode?: string;
  noteGlobale?: number;
  competences?: any;
  objectifs?: any;
  commentaires?: string;
  pointsForts?: string;
  pointsAmeliorer?: string;
  planAction?: string;
  commentaireEmploye?: string;
  commentaireEvaluateur?: string;
  status?: 'BROUILLON' | 'EN_COURS' | 'TERMINE' | 'VALIDE';
}

const getLatestContract = (employee: any) => {
  if (Array.isArray(employee?.contrats) && employee.contrats.length > 0) return employee.contrats[0];
  return null;
};

const mapEmployee = (employee: any) => {
  if (!employee) return undefined;
  const contract = getLatestContract(employee);
  return {
    ...employee,
    prenom: employee.prenom ?? employee.prenoms ?? employee.firstName,
    poste: employee.poste ?? contract?.posteOccupe,
    departement: employee.departement ?? contract?.service ?? contract?.direction,
  };
};

const mapEvaluationFromApi = (evaluation: any): Evaluation => ({
  ...evaluation,
  employe: mapEmployee(evaluation.employe),
  evaluateur: mapEmployee(evaluation.evaluateur),
  status: evaluation.status ?? 'TERMINE',
});

export const evaluationsService = {
  async getEvaluations(params?: {
    page?: number;
    limit?: number;
    employeId?: string;
    evaluateurId?: string;
    periode?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Evaluation>> {
    const response = await apiClient.get('/hr/evaluations', { params });
    const payload = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(payload) ? payload : payload?.data ?? [];
    const pagination = response.data?.pagination ?? payload?.pagination;
    return {
      success: true,
      data: list.map(mapEvaluationFromApi),
      meta: pagination ? { pagination } : undefined,
    };
  },

  async getEvaluation(id: string): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.get(`/hr/evaluations/${id}`);
    return { success: true, data: mapEvaluationFromApi(response.data?.data || response.data) };
  },

  async getEvaluationsByEmploye(employeId: string): Promise<ListResponse<Evaluation>> {
    const response = await apiClient.get(`/hr/evaluations/employe/${employeId}`);
    const payload = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(payload) ? payload : payload?.data ?? [];
    return { success: true, data: list.map(mapEvaluationFromApi) };
  },

  async createEvaluation(data: CreateEvaluationRequest): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.post('/hr/evaluations', data);
    return { success: true, data: mapEvaluationFromApi(response.data?.data || response.data) };
  },

  async updateEvaluation(id: string, data: UpdateEvaluationRequest): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.put(`/hr/evaluations/${id}`, data);
    return { success: true, data: mapEvaluationFromApi(response.data?.data || response.data) };
  },

  async deleteEvaluation(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/hr/evaluations/${id}`);
    return response.data;
  },

  async validateEvaluation(id: string): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.put(`/hr/evaluations/${id}`, {});
    return response.data;
  },
};
