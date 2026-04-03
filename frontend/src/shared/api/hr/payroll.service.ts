import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import {
  Payroll,
  CreatePayrollRequest,
  CalculateSalaryRequest,
  SalaryCalculation,
  PayrollOverview,
} from './types';

type PayrollListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  employeeId?: string;
  month?: number;
  year?: number;
}

const mapPayrollFromApi = (p: any): Payroll => ({
  id: p.id,
  employeeId: p.matricule ?? p.employeId ?? p.employeeId,
  period: p.periode ?? p.period ?? `${p.annee ?? p.year}-${String(p.mois ?? p.month).padStart(2, '0')}`,
  month: p.mois ?? p.month,
  year: p.annee ?? p.year,
  grossSalary: Number(p.salaireBrut ?? p.brut ?? p.baseSalaire ?? p.grossSalary ?? 0),
  netSalary: Number(p.salaireNet ?? p.netAPayer ?? p.netSalary ?? 0),
  totalPaid: Number(p.totalPaid ?? p.salaireNet ?? p.netAPayer ?? p.netSalary ?? 0),
  deductions: Number(p.totalRetenues ?? p.cotisationsSalariales ?? p.deductions ?? 0),
  bonuses: Number(p.primesTotal ?? p.primes ?? p.bonuses ?? 0),
  currency: p.devise ?? p.currency ?? 'XOF',
  paymentDate: p.datePaiement ?? p.paymentDate,
  status: (p.statutPaiement ?? p.statut ?? p.status ?? 'GENERE').toLowerCase(),
  socialContributions: Number(p.cotisationCnpsPatronale ?? p.cnpsPatronal ?? p.socialCharges ?? 0),
  taxAmount: Number(p.impotIgr ?? p.igr ?? p.taxAmount ?? 0),
  createdAt: p.dateGeneration ?? p.createdAt ?? '',
  updatedAt: p.updatedAt ?? '',
  employee: p.employe
    ? {
        ...p.employe,
        firstName: p.employe.prenoms ?? p.employe.prenom ?? p.employe.firstName,
        lastName: p.employe.nom ?? p.employe.lastName,
      }
    : p.employee
    ? {
        ...p.employee,
        firstName: p.employee.firstName ?? p.employee.prenom,
        lastName: p.employee.lastName ?? p.employee.nom,
      }
    : undefined,
});

const buildPagination = (page: number, pageSize: number, totalItems: number, totalPages: number) => ({
  currentPage: page,
  totalPages,
  pageSize,
  totalItems,
  hasNext: page < totalPages,
  hasPrevious: page > 1,
});

const buildPayrollParams = (params?: any): Record<string, any> => {
  const source = params || {};
  const month = source.month ?? source.filters?.month;
  const year = source.year ?? source.filters?.year;
  const page = source.page;
  const pageSize = source.pageSize ?? source.limit;
  const search = typeof source.search === 'string' ? source.search.trim() : '';
  const employeeId = source.employeeId ?? source.employeId;

  return Object.fromEntries(
    Object.entries({
      page,
      pageSize,
      search: search || undefined,
      employeeId,
      month,
      year,
    }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
};

export const payrollService = {
  async calculateSalary(data: CalculateSalaryRequest): Promise<SalaryCalculation> {
    const response = await apiClient.post('/payroll/calculate', data);
    return response.data;
  },

  async getPayrolls(params?: PayrollListParams): Promise<PaginatedResponse<Payroll>> {
    const response = await apiClient.get('/payrolls', { params: buildPayrollParams(params) });
    const payload = response.data?.data || response.data;
    const list = payload?.data ?? payload ?? [];
    const mapped = list.map(mapPayrollFromApi);
    const page = payload?.currentPage ?? payload?.page ?? 1;
    const pageSize = (payload?.pageSize ?? payload?.limit ?? mapped.length) || 10;
    const totalItems = payload?.totalItems ?? payload?.total ?? mapped.length;
    const totalPages = payload?.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
    return { data: mapped, pagination: buildPagination(page, pageSize, totalItems, totalPages) };
  },

  async getPayroll(id: string): Promise<Payroll> {
    const response = await apiClient.get(`/payrolls/${id}`);
    return mapPayrollFromApi(response.data?.data || response.data);
  },

  async getPayrollOverview(params?: { month?: number; year?: number }): Promise<PayrollOverview> {
    const response = await apiClient.get('/payroll/overview', { params });
    return response.data?.data || response.data;
  },

  async createPayroll(data: CreatePayrollRequest): Promise<Payroll> {
    const response = await apiClient.post('/payrolls', data);
    return mapPayrollFromApi(response.data?.data || response.data);
  },

  async updatePayroll(id: string, data: any): Promise<Payroll> {
    const response = await apiClient.patch(`/payrolls/${id}`, data);
    return mapPayrollFromApi(response.data?.data || response.data);
  },

  async deletePayroll(id: string): Promise<void> {
    await apiClient.delete(`/payrolls/${id}`);
  },

  async generatePayslip(data: { employeId: string; mois: number; annee: number }): Promise<Payroll> {
    const response = await apiClient.post('/payroll/generate', data);
    return mapPayrollFromApi(response.data?.data || response.data);
  },

  async generateAllPayslips(data: { mois: number; annee: number }): Promise<{ created: number }> {
    const response = await apiClient.post('/payroll/generate-all', data);
    return response.data?.data || response.data;
  },

  async downloadPayrollPdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/payrolls/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportPayrollDisa(params?: { month?: number; year?: number }): Promise<Blob> {
    const response = await apiClient.get('/payroll/exports/disa', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async exportPayrollDgi(params?: { month?: number; year?: number }): Promise<Blob> {
    const response = await apiClient.get('/payroll/exports/dgi', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async downloadGroupedPayrollPdf(params: { month?: number; year?: number; employeeIds?: string[] }): Promise<Blob> {
    const response = await apiClient.get('/payroll/exports/pdf-grouped', {
      params: {
        month: params.month,
        year: params.year,
        employeeIds: params.employeeIds?.length ? params.employeeIds.join(',') : undefined,
      },
      responseType: 'blob',
    });
    return response.data;
  },
};
