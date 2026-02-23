import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Payroll, CreatePayrollRequest, CalculateSalaryRequest, SalaryCalculation } from './types';

const mapPayrollFromApi = (p: any): Payroll => ({
  id: p.id,
  employeeId: p.employeId ?? p.employeeId,
  period: p.periode ?? `${p.annee}-${String(p.mois).padStart(2, '0')}`,
  month: p.mois ?? p.month,
  year: p.annee ?? p.year,
  grossSalary: Number(p.brut ?? p.baseSalaire ?? p.grossSalary ?? 0),
  netSalary: Number(p.netAPayer ?? p.netSalary ?? 0),
  deductions: Number(p.cotisationsSalariales ?? p.deductions ?? 0),
  bonuses: Number(p.primes ?? p.bonuses ?? 0),
  currency: p.devise ?? p.currency ?? 'XOF',
  paymentDate: p.datePaiement ?? p.paymentDate,
  status: (p.statut ?? p.status ?? 'GENERE').toLowerCase(),
  socialContributions: Number(p.cnpsPatronal ?? p.socialCharges ?? 0),
  taxAmount: Number(p.igr ?? p.taxAmount ?? 0),
  employee: p.employe
    ? {
        ...p.employe,
        firstName: p.employe.prenom ?? p.employe.firstName,
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

export const payrollService = {
  async calculateSalary(data: CalculateSalaryRequest): Promise<SalaryCalculation> {
    const response = await apiClient.post('/payroll/calculate', data);
    return response.data;
  },

  async getPayrolls(params?: any): Promise<PaginatedResponse<Payroll>> {
    const response = await apiClient.get('/payrolls', { params });
    const payload = response.data?.data || response.data;
    const list = payload?.data ?? payload ?? [];
    const mapped = list.map(mapPayrollFromApi);
    const pagination = {
      total: payload?.total ?? mapped.length,
      page: payload?.page ?? 1,
      limit: payload?.pageSize ?? mapped.length,
      totalPages: payload?.totalPages ?? 1,
    };
    return { data: mapped, pagination };
  },

  async getPayroll(id: string): Promise<Payroll> {
    const response = await apiClient.get(`/payrolls/${id}`);
    return mapPayrollFromApi(response.data?.data || response.data);
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
  }
};
