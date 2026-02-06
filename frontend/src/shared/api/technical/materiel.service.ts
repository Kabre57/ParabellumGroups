import { apiClient } from '../shared/client';
import { Materiel, SortieMateriel } from './types';

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

export interface CreateMaterielRequest {
  reference: string;
  nom: string;
  description?: string;
  categorie: string;
  quantiteStock: number;
  seuilAlerte?: number;
  seuilRupture?: number;
  prixUnitaire?: number;
  fournisseur?: string;
  emplacementStock?: string;
  notes?: string;
}

export interface UpdateMaterielRequest {
  nom?: string;
  description?: string;
  categorie?: string;
  quantiteStock?: number;
  seuilAlerte?: number;
  seuilRupture?: number;
  prixUnitaire?: number;
  fournisseur?: string;
  emplacementStock?: string;
  notes?: string;
}

export interface SortieMaterielRequest {
  materielId: string;
  interventionId: string;
  technicienId?: string;
  quantite: number;
  notes?: string;
}

export interface RetourMaterielRequest {
  etatRetour?: 'BON' | 'ENDOMMAGE' | 'PERDU';
  notes?: string;
}

export interface MaterielAlerte {
  id: string;
  materiel: Materiel;
  type: 'RUPTURE' | 'ALERTE';
  quantiteActuelle: number;
  seuil: number;
}

export const materielService = {
  async getMateriels(params?: {
    page?: number;
    limit?: number;
    categorie?: string;
    enAlerte?: boolean;
    enRupture?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListResponse<Materiel>> {
    const response = await apiClient.get('/technical/materiel', { params });
    return response.data;
  },

  async getMateriel(id: string): Promise<DetailResponse<Materiel>> {
    const response = await apiClient.get(`/technical/materiel/${id}`);
    return response.data;
  },

  async getAlertes(): Promise<ListResponse<MaterielAlerte>> {
    const response = await apiClient.get('/technical/materiel/alertes');
    return response.data;
  },

  async getSortiesEnCours(): Promise<ListResponse<SortieMateriel>> {
    const response = await apiClient.get('/technical/materiel/sorties-en-cours');
    return response.data;
  },

  async createMateriel(data: CreateMaterielRequest): Promise<DetailResponse<Materiel>> {
    const response = await apiClient.post('/technical/materiel', data);
    return response.data;
  },

  async updateMateriel(id: string, data: UpdateMaterielRequest): Promise<DetailResponse<Materiel>> {
    const response = await apiClient.put(`/technical/materiel/${id}`, data);
    return response.data;
  },

  async deleteMateriel(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/technical/materiel/${id}`);
    return response.data;
  },

  async sortirMateriel(data: SortieMaterielRequest): Promise<DetailResponse<SortieMateriel>> {
    const response = await apiClient.post('/technical/materiel/sorties', data);
    return response.data;
  },

  async retourMateriel(sortieId: string, data?: RetourMaterielRequest): Promise<DetailResponse<SortieMateriel>> {
    const response = await apiClient.patch(`/technical/materiel/sorties/${sortieId}/retour`, data || {});
    return response.data;
  },
};
