import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';

export interface LoanPayload {
  id: string;
  employeId: string;
  type: 'AVANCE' | 'PRET';
  motif?: string;
  montantInitial: number;
  restantDu: number;
  deductionMensuelle: number;
  dateDebut: string;
  dateFin?: string;
  statut: string;
  employe?: {
    nom?: string;
    prenom?: string;
    departement?: string;
  };
}

const mapLoan = (l: any): LoanPayload => ({
  id: l.id,
  employeId: l.employeId,
  type: l.type,
  motif: l.motif,
  montantInitial: Number(l.montantInitial || 0),
  restantDu: Number(l.restantDu || 0),
  deductionMensuelle: Number(l.deductionMensuelle || 0),
  dateDebut: l.dateDebut,
  dateFin: l.dateFin,
  statut: l.statut,
  employe: l.employe,
});

export const loansService = {
  async list(params?: any): Promise<PaginatedResponse<LoanPayload>> {
    const response = await apiClient.get('/hr/loans', { params });
    const payload = response.data?.data || response.data;
    if (Array.isArray(payload)) {
      return { data: payload.map(mapLoan), pagination: { total: payload.length, page: 1, limit: payload.length, totalPages: 1 } };
    }
    const rows = payload?.data || [];
    const pagination = payload?.pagination || { total: rows.length, page: 1, limit: rows.length, totalPages: 1 };
    return { data: rows.map(mapLoan), pagination };
  },

  async create(data: any): Promise<LoanPayload> {
    const response = await apiClient.post('/hr/loans', data);
    return mapLoan(response.data?.data || response.data);
  },

  async update(id: string, data: any): Promise<LoanPayload> {
    const response = await apiClient.patch(`/hr/loans/${id}`, data);
    return mapLoan(response.data?.data || response.data);
  },

  async terminate(id: string): Promise<LoanPayload> {
    const response = await apiClient.patch(`/hr/loans/${id}/terminate`);
    return mapLoan(response.data?.data || response.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/hr/loans/${id}`);
  },
};
