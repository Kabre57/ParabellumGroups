import { apiClient } from '../shared/client';

export type TypeConge = 'ANNUEL' | 'MALADIE' | 'SANS_SOLDE' | 'PARENTAL' | 'MATERNITE' | 'PATERNITE';
export type StatutConge = 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'ANNULE';

export interface Conge {
  id: string;
  employeId: string;
  employe?: {
    id: string;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  typeConge: TypeConge;
  dateDebut: string;
  dateFin: string;
  nbJours: number;
  motif?: string;
  statut: StatutConge;
  approuveParId?: string;
  approuvePar?: {
    nom: string;
    prenom: string;
  };
  dateApprobation?: string;
  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SoldeConge {
  employeId: string;
  annuel: number;
  maladie: number;
  sanssolde: number;
  pris: {
    annuel: number;
    maladie: number;
    sanssolde: number;
  };
  restant: {
    annuel: number;
    maladie: number;
    sanssolde: number;
  };
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

export interface CreateCongeRequest {
  employeId: string;
  typeConge: TypeConge;
  dateDebut: string;
  dateFin: string;
  nbJours?: number;
  motif?: string;
}

export interface UpdateCongeRequest {
  typeConge?: TypeConge;
  dateDebut?: string;
  dateFin?: string;
  nbJours?: number;
  motif?: string;
}

const mapStatus = (s?: string): StatutConge => {
  switch ((s || '').toUpperCase()) {
    case 'DEMANDE':
    case 'EN_ATTENTE':
      return 'EN_ATTENTE';
    case 'APPROUVE':
    case 'APPROUVÉ':
      return 'APPROUVE';
    case 'REFUSE':
    case 'REJETÉ':
    case 'REJETE':
      return 'REFUSE';
    case 'ANNULE':
    case 'ANNULÉ':
      return 'ANNULE';
    default:
      return 'EN_ATTENTE';
  }
};

const mapCongeFromApi = (c: any): Conge => ({
  id: c.id,
  employeId: c.employeId ?? c.employeeId,
  employe: c.employe
    ? {
        id: c.employeId,
        nom: c.employe.nom,
        prenom: c.employe.prenom,
        matricule: c.employe.matricule,
      }
    : undefined,
  typeConge: c.typeConge,
  dateDebut: c.dateDebut,
  dateFin: c.dateFin,
  nbJours: c.nbJours,
  motif: c.motif,
  statut: mapStatus(c.status ?? c.statut),
  approuveParId: c.approbateurId,
  approuvePar: c.approbateur
    ? { nom: c.approbateur.nom, prenom: c.approbateur.prenom }
    : undefined,
  dateApprobation: c.dateApprobation,
  commentaire: c.commentaire,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export const congesService = {
  async getConges(params?: {
    page?: number;
    limit?: number;
    employeId?: string;
    typeConge?: TypeConge;
    statut?: StatutConge;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Conge>> {
    const response = await apiClient.get('/hr/leave-requests', { params });
    const payload = response.data?.data ?? response.data;
    const list = payload?.data ?? payload ?? [];
    return {
      success: true,
      data: list.map(mapCongeFromApi),
      meta: payload?.meta,
    };
  },

  async getConge(id: string): Promise<DetailResponse<Conge>> {
    const response = await apiClient.get(`/hr/leave-requests/${id}`);
    return { success: true, data: mapCongeFromApi(response.data?.data || response.data) };
  },

  async getCalendrier(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ListResponse<Conge>> {
    const response = await apiClient.get('/hr/leave-requests/calendrier', { params });
    const list = response.data?.data ?? response.data ?? [];
    return { success: true, data: list.map(mapCongeFromApi) };
  },

  async getSolde(employeId: string): Promise<DetailResponse<SoldeConge>> {
    const response = await apiClient.get(`/hr/leave-requests/solde/${employeId}`);
    return response.data;
  },

  async createConge(data: CreateCongeRequest): Promise<DetailResponse<Conge>> {
    const response = await apiClient.post('/hr/leave-requests', data);
    return { success: true, data: mapCongeFromApi(response.data?.data || response.data) };
  },

  async updateConge(id: string, data: UpdateCongeRequest): Promise<DetailResponse<Conge>> {
    const response = await apiClient.put(`/hr/leave-requests/${id}`, data);
    return { success: true, data: mapCongeFromApi(response.data?.data || response.data) };
  },

  async deleteConge(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/hr/leave-requests/${id}`);
    return response.data;
  },

  async approveConge(id: string, commentaire?: string): Promise<DetailResponse<Conge>> {
    const response = await apiClient.patch(`/hr/leave-requests/${id}/approve`, { commentaire });
    return { success: true, data: mapCongeFromApi(response.data?.data || response.data) };
  },

  async rejectConge(id: string, commentaire?: string): Promise<DetailResponse<Conge>> {
    const response = await apiClient.patch(`/hr/leave-requests/${id}/reject`, { commentaire });
    return { success: true, data: mapCongeFromApi(response.data?.data || response.data) };
  },
};
