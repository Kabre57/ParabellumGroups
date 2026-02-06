import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Contract } from './types';

export const employeesService = {
  async getEmployees(params?: any): Promise<PaginatedResponse<Employee>> {
    const response = await apiClient.get('/employees', { params });
    return response.data;
  },

  async getEmployee(id: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await apiClient.put(`/employees/${id}`, data);
    return response.data;
  },

  async deleteEmployee(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },

  async getEmployeeContracts(id: string): Promise<Contract[]> {
    const response = await apiClient.get(`/employees/${id}/contracts`);
    return response.data;
  }
};
