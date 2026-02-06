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
  competences?: {
    nom: string;
    note: number;
    commentaire?: string;
  }[];
  objectifs?: {
    description: string;
    atteint: boolean;
    commentaire?: string;
  }[];
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
  competences?: {
    nom: string;
    note: number;
    commentaire?: string;
  }[];
  objectifs?: {
    description: string;
    atteint: boolean;
    commentaire?: string;
  }[];
  pointsForts?: string;
  pointsAmeliorer?: string;
  planAction?: string;
}

export interface UpdateEvaluationRequest {
  dateEvaluation?: string;
  periode?: string;
  noteGlobale?: number;
  competences?: {
    nom: string;
    note: number;
    commentaire?: string;
  }[];
  objectifs?: {
    description: string;
    atteint: boolean;
    commentaire?: string;
  }[];
  pointsForts?: string;
  pointsAmeliorer?: string;
  planAction?: string;
  commentaireEmploye?: string;
  commentaireEvaluateur?: string;
  status?: 'BROUILLON' | 'EN_COURS' | 'TERMINE' | 'VALIDE';
}

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
    return response.data;
  },

  async getEvaluation(id: string): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.get(`/hr/evaluations/${id}`);
    return response.data;
  },

  async getEvaluationsByEmploye(employeId: string): Promise<ListResponse<Evaluation>> {
    const response = await apiClient.get(`/hr/evaluations/employe/${employeId}`);
    return response.data;
  },

  async createEvaluation(data: CreateEvaluationRequest): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.post('/hr/evaluations', data);
    return response.data;
  },

  async updateEvaluation(id: string, data: UpdateEvaluationRequest): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.put(`/hr/evaluations/${id}`, data);
    return response.data;
  },

  async deleteEvaluation(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/hr/evaluations/${id}`);
    return response.data;
  },

  async validateEvaluation(id: string): Promise<DetailResponse<Evaluation>> {
    const response = await apiClient.patch(`/hr/evaluations/${id}`, { status: 'VALIDE' });
    return response.data;
  },
};
