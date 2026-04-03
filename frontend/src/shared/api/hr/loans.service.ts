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
  employeId: l.employeId ?? l.matricule,
  type: l.type ?? 'PRET',
  motif: l.motif ?? l.motifPret,
  montantInitial: Number(l.montantInitial ?? l.montantTotalPrete ?? 0),
  restantDu: Number(l.restantDu ?? l.montantRestantDu ?? 0),
  deductionMensuelle: Number(l.deductionMensuelle ?? l.mensualiteRetenue ?? 0),
  dateDebut: l.dateDebut ?? l.dateDebutRemboursement,
  dateFin: l.dateFin ?? l.dateFinRemboursement,
  statut: l.statut,
  employe: l.employe,
});

const buildPagination = (page: number, pageSize: number, totalItems: number, totalPages: number) => ({
  currentPage: page,
  totalPages,
  pageSize,
  totalItems,
  hasNext: page < totalPages,
  hasPrevious: page > 1,
});

export const loansService = {
  async getLoans(params?: any): Promise<PaginatedResponse<LoanPayload>> {
    return this.list(params);
  },
  async list(params?: any): Promise<PaginatedResponse<LoanPayload>> {
    const response = await apiClient.get('/hr/loans', { params });
    const payload = response.data?.data || response.data;
    if (Array.isArray(payload)) {
      const totalItems = payload.length;
      return {
        data: payload.map(mapLoan),
        pagination: buildPagination(1, totalItems || 10, totalItems, 1),
      };
    }
    const rows = payload?.data || [];
    const rawPagination = payload?.pagination || {};
    const currentPage = rawPagination.currentPage ?? rawPagination.page ?? 1;
    const pageSize = (rawPagination.pageSize ?? rawPagination.limit ?? rows.length) || 10;
    const totalItems = rawPagination.totalItems ?? rawPagination.total ?? rows.length;
    const totalPages = rawPagination.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));

    return { data: rows.map(mapLoan), pagination: buildPagination(currentPage, pageSize, totalItems, totalPages) };
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
