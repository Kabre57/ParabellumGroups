import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, SearchParams } from '../types';
import { AxiosResponse } from 'axios';

/**
 * Types pour le service RH
 */

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  position: string;
  department: string;
  hireDate: string;
  employmentStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  salary: number;
  currency: string;
  workHoursPerWeek: number;
  position: string;
  department: string;
  signedDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryCalculation {
  grossSalary: number;
  netSalary: number;
  socialContributions: number;
  taxAmount: number;
  employerContributions: number;
  totalCost: number;
  breakdown: {
    cnss?: number;
    ipr?: number;
    autres?: number;
  };
}

export interface Payroll {
  id: string;
  employeeId: string;
  period: string;
  month: number;
  year: number;
  grossSalary: number;
  netSalary: number;
  deductions: number;
  bonuses: number;
  totalPaid: number;
  currency: string;
  paymentDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  interestRate: number;
  term: number;
  monthlyPayment: number;
  remainingBalance: number;
  startDate: string;
  endDate: string;
  status: string;
  purpose?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  position: string;
  department: string;
  hireDate: string;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  position?: string;
  department?: string;
  employmentStatus?: string;
}

export interface CreateContractRequest {
  employeeId: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  salary: number;
  currency: string;
  workHoursPerWeek: number;
  position: string;
  department: string;
}

export interface CalculateSalaryRequest {
  grossSalary: number;
  employeeId?: string;
  period?: string;
  bonuses?: number;
  deductions?: number;
}

export interface CreatePayrollRequest {
  employeeId: string;
  period: string;
  month: number;
  year: number;
  grossSalary: number;
  deductions?: number;
  bonuses?: number;
  currency: string;
}

export interface CreateLeaveRequest {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface CreateLoanRequest {
  employeeId: string;
  amount: number;
  currency: string;
  interestRate: number;
  term: number;
  startDate: string;
  purpose?: string;
}

/**
 * Service de gestion des ressources humaines
 */
class HRService {
  private readonly basePath = '/hr';

  /**
   * Récupère la liste des employés
   */
  async getEmployees(params?: SearchParams): Promise<PaginatedResponse<Employee>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Employee>>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/employees`, { params });
    
    return response.data.data;
  }

  /**
   * Récupère un employé par son ID
   */
  async getEmployee(id: string): Promise<Employee> {
    const response: AxiosResponse<ApiResponse<Employee>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/employees/${id}`);
    
    return response.data.data;
  }

  /**
   * Crée un nouvel employé
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const response: AxiosResponse<ApiResponse<Employee>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/employees`, data);
    
    return response.data.data;
  }

  /**
   * Met à jour un employé
   */
  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response: AxiosResponse<ApiResponse<Employee>> = 
      await apiClient.getAxiosInstance().patch(`${this.basePath}/employees/${id}`, data);
    
    return response.data.data;
  }

  /**
   * Récupère la liste de tous les contrats
   */
  async getAllContracts(params?: SearchParams): Promise<PaginatedResponse<Contract>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Contract>>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/contracts`, { params });
    
    return response.data.data;
  }

  /**
   * Récupère un contrat par son ID
   */
  async getContract(id: string): Promise<Contract> {
    const response: AxiosResponse<ApiResponse<Contract>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/contracts/${id}`);
    
    return response.data.data;
  }

  /**
   * Récupère les contrats d'un employé
   */
  async getContracts(employeeId: string): Promise<Contract[]> {
    const response: AxiosResponse<ApiResponse<Contract[]>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/employees/${employeeId}/contracts`);
    
    return response.data.data;
  }

  /**
   * Crée un nouveau contrat
   */
  async createContract(data: CreateContractRequest): Promise<Contract> {
    const response: AxiosResponse<ApiResponse<Contract>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/contracts`, data);
    
    return response.data.data;
  }

  /**
   * Met à jour un contrat
   */
  async updateContract(id: string, data: Partial<CreateContractRequest>): Promise<Contract> {
    const response: AxiosResponse<ApiResponse<Contract>> = 
      await apiClient.getAxiosInstance().patch(`${this.basePath}/contracts/${id}`, data);
    
    return response.data.data;
  }

  /**
   * Supprime un contrat
   */
  async deleteContract(id: string): Promise<void> {
    await apiClient.getAxiosInstance().delete(`${this.basePath}/contracts/${id}`);
  }

  /**
   * Calcule le salaire avec cotisations (CI)
   */
  async calculateSalary(data: CalculateSalaryRequest): Promise<SalaryCalculation> {
    const response: AxiosResponse<ApiResponse<SalaryCalculation>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/salary/calculate`, data);
    
    return response.data.data;
  }

  /**
   * Récupère la liste des bulletins de paie
   */
  async getPayroll(params?: SearchParams): Promise<PaginatedResponse<Payroll>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Payroll>>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/payroll`, { params });
    
    return response.data.data;
  }

  /**
   * Récupère un bulletin de paie par son ID
   */
  async getPayrollById(id: string): Promise<Payroll> {
    const response: AxiosResponse<ApiResponse<Payroll>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/payroll/${id}`);
    
    return response.data.data;
  }

  /**
   * Crée un nouveau bulletin de paie
   */
  async createPayroll(data: CreatePayrollRequest): Promise<Payroll> {
    const response: AxiosResponse<ApiResponse<Payroll>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/payroll`, data);
    
    return response.data.data;
  }

  /**
   * Met à jour un bulletin de paie
   */
  async updatePayroll(id: string, data: Partial<CreatePayrollRequest>): Promise<Payroll> {
    const response: AxiosResponse<ApiResponse<Payroll>> = 
      await apiClient.getAxiosInstance().patch(`${this.basePath}/payroll/${id}`, data);
    
    return response.data.data;
  }

  /**
   * Supprime un bulletin de paie
   */
  async deletePayroll(id: string): Promise<void> {
    await apiClient.getAxiosInstance().delete(`${this.basePath}/payroll/${id}`);
  }

  /**
   * Génère automatiquement un bulletin de paie pour un employé
   */
  async generatePayslip(employeeId: string, period: string): Promise<Payroll> {
    const response: AxiosResponse<ApiResponse<Payroll>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/payroll/generate`, {
        employeeId,
        period
      });
    
    return response.data.data;
  }

  /**
   * Récupère la liste des demandes de congé
   */
  async getLeaveRequests(params?: SearchParams): Promise<PaginatedResponse<LeaveRequest>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<LeaveRequest>>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/leave-requests`, { params });
    
    return response.data.data;
  }

  /**
   * Crée une nouvelle demande de congé
   */
  async createLeaveRequest(data: CreateLeaveRequest): Promise<LeaveRequest> {
    const response: AxiosResponse<ApiResponse<LeaveRequest>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/leave-requests`, data);
    
    return response.data.data;
  }

  /**
   * Approuve une demande de congé
   */
  async approveLeaveRequest(id: string): Promise<LeaveRequest> {
    const response: AxiosResponse<ApiResponse<LeaveRequest>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/leave-requests/${id}/approve`);
    
    return response.data.data;
  }

  /**
   * Rejette une demande de congé
   */
  async rejectLeaveRequest(id: string, reason?: string): Promise<LeaveRequest> {
    const response: AxiosResponse<ApiResponse<LeaveRequest>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/leave-requests/${id}/reject`, { reason });
    
    return response.data.data;
  }

  /**
   * Récupère la liste des prêts
   */
  async getLoans(params?: SearchParams): Promise<PaginatedResponse<Loan>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<Loan>>> = 
      await apiClient.getAxiosInstance().get(`${this.basePath}/loans`, { params });
    
    return response.data.data;
  }

  /**
   * Crée un nouveau prêt
   */
  async createLoan(data: CreateLoanRequest): Promise<Loan> {
    const response: AxiosResponse<ApiResponse<Loan>> = 
      await apiClient.getAxiosInstance().post(`${this.basePath}/loans`, data);
    
    return response.data.data;
  }
}

// Export d'une instance unique du service
export const hrService = new HRService();
export default hrService;
