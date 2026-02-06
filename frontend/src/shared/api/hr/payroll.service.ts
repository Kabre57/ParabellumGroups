import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Payroll, CreatePayrollRequest, CalculateSalaryRequest, SalaryCalculation } from './types';

export const payrollService = {
  async calculateSalary(data: CalculateSalaryRequest): Promise<SalaryCalculation> {
    const response = await apiClient.post('/payroll/calculate', data);
    return response.data;
  },

  async getPayrolls(params?: any): Promise<PaginatedResponse<Payroll>> {
    const response = await apiClient.get('/payrolls', { params });
    return response.data;
  },

  async getPayroll(id: string): Promise<Payroll> {
    const response = await apiClient.get(`/payrolls/${id}`);
    return response.data;
  },

  async createPayroll(data: CreatePayrollRequest): Promise<Payroll> {
    const response = await apiClient.post('/payrolls', data);
    return response.data;
  },

  async updatePayroll(id: string, data: any): Promise<Payroll> {
    const response = await apiClient.put(`/payrolls/${id}`, data);
    return response.data;
  },

  async deletePayroll(id: string): Promise<void> {
    await apiClient.delete(`/payrolls/${id}`);
  }
};
