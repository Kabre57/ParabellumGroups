import { apiClient } from '../client';
import { PaginatedResponse, SearchParams } from '../types';

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
  employee?: {
    firstName?: string;
    lastName?: string;
    matricule?: string;
    cnpsNumber?: string;
    cnamNumber?: string;
    position?: string;
  };
  [key: string]: any;
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

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mapEmployeeStatus = (status?: string) => status || 'ACTIF';

const mapEmployee = (employee: any): Employee => {
  const status = mapEmployeeStatus(employee.status || employee.employmentStatus);
  return {
    id: employee.id,
    firstName: employee.prenom || employee.firstName || '',
    lastName: employee.nom || employee.lastName || '',
    email: employee.email || '',
    phoneNumber: employee.telephone || employee.phoneNumber,
    dateOfBirth: employee.dateNaissance || employee.dateOfBirth,
    address: employee.adresse || employee.address,
    position: employee.poste || employee.position || '',
    department: employee.departement || employee.department || '',
    hireDate: employee.dateEmbauche || employee.hireDate || new Date().toISOString(),
    employmentStatus: status,
    isActive: status === 'ACTIF',
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: employee.updatedAt || employee.createdAt || new Date().toISOString(),
  };
};

const mapContract = (contract: any): Contract => {
  return {
    id: contract.id,
    employeeId: contract.employeeId || contract.employee_id,
    contractType: contract.contractType || contract.contract_type,
    startDate: contract.startDate || contract.start_date,
    endDate: contract.endDate || contract.end_date,
    salary: toNumber(contract.salary),
    currency: contract.currency || 'XOF',
    workHoursPerWeek: contract.workHoursPerWeek || contract.work_hours_per_week || 40,
    position: contract.position || '',
    department: contract.department || '',
    signedDate: contract.signedDate || contract.signed_date,
    status: contract.status || 'ACTIVE',
    createdAt: contract.createdAt || contract.created_at || new Date().toISOString(),
    updatedAt: contract.updatedAt || contract.updated_at || new Date().toISOString(),
  };
};

const mapPayroll = (payroll: any): Payroll => {
  const grossSalary = toNumber(payroll.grossSalary || payroll.gross_salary || payroll.baseSalary || payroll.base_salary);
  const netSalary = toNumber(payroll.netSalary || payroll.net_salary);
  const totalDeductions = toNumber(payroll.totalDeductions || payroll.total_deductions);
  return {
    id: payroll.id,
    employeeId: payroll.employeeId || payroll.employee_id,
    period: payroll.period,
    month: payroll.month,
    year: payroll.year,
    grossSalary,
    netSalary,
    deductions: totalDeductions,
    bonuses: toNumber(payroll.bonuses || payroll.bonus),
    totalPaid: toNumber(payroll.totalPaid || payroll.total_paid || netSalary),
    currency: payroll.currency || 'XOF',
    paymentDate: payroll.paymentDate || payroll.payment_date,
    status: payroll.status || 'GENERATED',
    createdAt: payroll.createdAt || payroll.created_at || new Date().toISOString(),
    updatedAt: payroll.updatedAt || payroll.updated_at || new Date().toISOString(),
    employee: payroll.employee || undefined,
    baseSalary: payroll.baseSalary || payroll.base_salary || grossSalary,
    gross_salary: grossSalary,
    net_salary: netSalary,
    totalDeductions,
    total_deductions: totalDeductions,
  };
};

const mapLeaveType = (type?: string) => {
  switch (type) {
    case 'ANNUEL':
      return 'ANNUAL';
    case 'MALADIE':
      return 'SICK';
    case 'SANS_SOLDE':
      return 'UNPAID';
    case 'PARENTAL':
      return 'PARENTAL';
    default:
      return type || 'ANNUAL';
  }
};

const mapLeaveTypeToApi = (type?: string) => {
  switch (type) {
    case 'ANNUAL':
      return 'ANNUEL';
    case 'SICK':
      return 'MALADIE';
    case 'UNPAID':
      return 'SANS_SOLDE';
    case 'MATERNITY':
    case 'PATERNITY':
      return 'PARENTAL';
    case 'PARENTAL':
      return 'PARENTAL';
    default:
      return 'ANNUEL';
  }
};

const mapLeaveStatus = (status?: string) => {
  switch (status) {
    case 'DEMANDE':
      return 'PENDING';
    case 'APPROUVE':
      return 'APPROVED';
    case 'REJETE':
      return 'REJECTED';
    case 'ANNULE':
      return 'CANCELLED';
    default:
      return status || 'PENDING';
  }
};

const mapLeaveStatusToApi = (status?: string) => {
  switch (status) {
    case 'PENDING':
      return 'DEMANDE';
    case 'APPROVED':
      return 'APPROUVE';
    case 'REJECTED':
      return 'REJETE';
    case 'CANCELLED':
      return 'ANNULE';
    default:
      return status;
  }
};

const mapLeaveRequest = (leave: any): LeaveRequest => {
  return {
    id: leave.id,
    employeeId: leave.employeId || leave.employeeId,
    leaveType: mapLeaveType(leave.typeConge || leave.leaveType),
    startDate: leave.dateDebut || leave.startDate,
    endDate: leave.dateFin || leave.endDate,
    totalDays: leave.nbJours || leave.totalDays || 0,
    reason: leave.motif || leave.reason,
    status: mapLeaveStatus(leave.status),
    approvedBy: leave.approbateurId || leave.approvedBy,
    approvedAt: leave.dateApprobation || leave.approvedAt,
    rejectedReason: leave.rejectedReason,
    createdAt: leave.createdAt || new Date().toISOString(),
    updatedAt: leave.updatedAt || new Date().toISOString(),
  };
};

const normalizePagination = (pagination: any, itemCount: number) => {
  if (!pagination) {
    return {
      currentPage: 1,
      totalPages: 1,
      pageSize: itemCount,
      totalItems: itemCount,
      hasNext: false,
      hasPrevious: false,
    };
  }

  const totalItems = pagination.total || pagination.totalItems || itemCount;
  const pageSize = pagination.limit || pagination.pageSize || pagination.page_size || itemCount || 10;
  const currentPage = pagination.page || pagination.currentPage || 1;
  const totalPages = pagination.totalPages || Math.ceil(totalItems / pageSize) || 1;

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
};

const extractList = (payload: any) => {
  if (!payload) return { items: [], pagination: undefined };
  if (payload.success && payload.data) {
    const data = payload.data;
    return {
      items: data.data || [],
      pagination: {
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      },
    };
  }
  if (payload.data && payload.pagination) {
    return { items: payload.data, pagination: payload.pagination };
  }
  if (Array.isArray(payload)) {
    return { items: payload, pagination: undefined };
  }
  return { items: payload.data || [], pagination: payload.pagination };
};

const buildEmployeeParams = (params?: SearchParams) => {
  if (!params) return undefined;
  const mapped: Record<string, any> = {};
  if (params.page) mapped.page = params.page;
  if (params.pageSize) mapped.limit = params.pageSize;
  if (params.query) mapped.search = params.query;
  if (params.filters?.department) mapped.departement = params.filters.department;
  if (params.filters?.isActive === true) {
    mapped.status = 'ACTIF';
  }
  if (params.filters?.employmentStatus) {
    const allowedStatuses = ['ACTIF', 'CONGE', 'MALADIE', 'DEMISSION'];
    if (allowedStatuses.includes(params.filters.employmentStatus)) {
      mapped.status = params.filters.employmentStatus;
    }
  }
  return mapped;
};

const buildLeaveParams = (params?: SearchParams) => {
  if (!params) return undefined;
  const mapped: Record<string, any> = {};
  if (params.page) mapped.page = params.page;
  if (params.pageSize) mapped.limit = params.pageSize;
  if (params.query) mapped.search = params.query;
  if (params.filters?.employeeId) mapped.employeId = params.filters.employeeId;
  if (params.filters?.status) mapped.status = mapLeaveStatusToApi(params.filters.status);
  if (params.filters?.leaveType) mapped.typeConge = mapLeaveTypeToApi(params.filters.leaveType);
  return mapped;
};

/**
 * Service de gestion des ressources humaines
 */
class HRService {
  private readonly basePath = '/hr';

  async getEmployees(params?: SearchParams): Promise<PaginatedResponse<Employee>> {
    const response = await apiClient.get(`${this.basePath}/employees`, {
      params: buildEmployeeParams(params),
    });
    const payload = response.data;
    let items: Employee[] = (payload?.data || []).map(mapEmployee);
    if (params?.filters?.isActive === false) {
      items = items.filter((employee: Employee) => !employee.isActive);
    }
    return {
      data: items,
      pagination: normalizePagination(payload?.pagination, items.length),
    };
  }

  async getEmployee(id: string): Promise<Employee> {
    const response = await apiClient.get(`${this.basePath}/employees/${id}`);
    return mapEmployee(response.data);
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const payload = {
      nom: data.lastName,
      prenom: data.firstName,
      email: data.email,
      telephone: data.phoneNumber,
      dateEmbauche: data.hireDate,
      poste: data.position,
      departement: data.department,
    };
    const response = await apiClient.post(`${this.basePath}/employees`, payload);
    return mapEmployee(response.data);
  }

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const payload = {
      nom: data.lastName,
      prenom: data.firstName,
      email: data.email,
      telephone: data.phoneNumber,
      poste: data.position,
      departement: data.department,
      status: data.employmentStatus,
    };
    const response = await apiClient.put(`${this.basePath}/employees/${id}`, payload);
    return mapEmployee(response.data);
  }

  async getAllContracts(params?: SearchParams): Promise<PaginatedResponse<Contract>> {
    const response = await apiClient.get(`${this.basePath}/contracts`, { params });
    const extracted = extractList(response.data);
    const items = extracted.items.map(mapContract);
    return {
      data: items,
      pagination: normalizePagination(extracted.pagination, items.length),
    };
  }

  async getContract(id: string): Promise<Contract> {
    const response = await apiClient.get(`${this.basePath}/contracts/${id}`);
    const payload = response.data?.data || response.data;
    return mapContract(payload);
  }

  async getContracts(employeeId: string): Promise<Contract[]> {
    const response = await apiClient.get(`${this.basePath}/employees/${employeeId}/contracts`);
    const extracted = extractList(response.data);
    return extracted.items.map(mapContract);
  }

  async createContract(data: CreateContractRequest): Promise<Contract> {
    const response = await apiClient.post(`${this.basePath}/contracts`, data);
    const payload = response.data?.data || response.data;
    return mapContract(payload);
  }

  async updateContract(id: string, data: Partial<CreateContractRequest>): Promise<Contract> {
    const response = await apiClient.patch(`${this.basePath}/contracts/${id}`, data);
    const payload = response.data?.data || response.data;
    return mapContract(payload);
  }

  async deleteContract(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/contracts/${id}`);
  }

  async calculateSalary(data: CalculateSalaryRequest): Promise<SalaryCalculation> {
    const gross = data.grossSalary || 0;
    const bonuses = data.bonuses || 0;
    const deductions = data.deductions || 0;
    const cnss = gross * 0.068;
    const autres = gross * 0.015 + gross * 0.012;
    const taxableIncome = gross + bonuses - (cnss + autres);
    const taxAmount = Math.max(0, taxableIncome * 0.1);
    const socialContributions = cnss + autres;
    const netSalary = gross + bonuses - (socialContributions + taxAmount + deductions);
    const employerContributions = gross * (0.084 + 0.035 + 0.012 + 0.02);

    return {
      grossSalary: gross,
      netSalary,
      socialContributions,
      taxAmount,
      employerContributions,
      totalCost: gross + bonuses + employerContributions,
      breakdown: {
        cnss,
        ipr: taxAmount,
        autres,
      },
    };
  }

  async getPayroll(params?: SearchParams): Promise<PaginatedResponse<Payroll>> {
    const response = await apiClient.get(`${this.basePath}/payroll`, { params });
    const extracted = extractList(response.data);
    const items = extracted.items.map(mapPayroll);
    return {
      data: items,
      pagination: normalizePagination(extracted.pagination, items.length),
    };
  }

  async getPayrollById(id: string): Promise<Payroll> {
    const response = await apiClient.get(`${this.basePath}/payroll/${id}`);
    const payload = response.data?.data || response.data;
    return mapPayroll(payload);
  }

  async createPayroll(data: CreatePayrollRequest): Promise<Payroll> {
    const response = await apiClient.post(`${this.basePath}/payroll`, data);
    const payload = response.data?.data || response.data;
    return mapPayroll(payload);
  }

  async updatePayroll(id: string, data: Partial<CreatePayrollRequest>): Promise<Payroll> {
    const response = await apiClient.patch(`${this.basePath}/payroll/${id}`, data);
    const payload = response.data?.data || response.data;
    return mapPayroll(payload);
  }

  async deletePayroll(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/payroll/${id}`);
  }

  async generatePayslip(employeeId: string, period: string): Promise<Payroll> {
    const response = await apiClient.post(`${this.basePath}/payroll/generate`, {
      employeeId,
      period,
    });
    const payload = response.data?.data || response.data;
    return mapPayroll(payload);
  }

  async getLeaveRequests(params?: SearchParams): Promise<PaginatedResponse<LeaveRequest>> {
    const response = await apiClient.get(`${this.basePath}/leave-requests`, {
      params: buildLeaveParams(params),
    });
    const payload = response.data;
    const items = (payload?.data || []).map(mapLeaveRequest);
    return {
      data: items,
      pagination: normalizePagination(payload?.pagination, items.length),
    };
  }

  async createLeaveRequest(data: CreateLeaveRequest): Promise<LeaveRequest> {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const payload = {
      employeId: data.employeeId,
      typeConge: mapLeaveTypeToApi(data.leaveType),
      dateDebut: data.startDate,
      dateFin: data.endDate,
      nbJours: diffDays,
      motif: data.reason,
    };
    const response = await apiClient.post(`${this.basePath}/leave-requests`, payload);
    return mapLeaveRequest(response.data);
  }

  async approveLeaveRequest(id: string): Promise<LeaveRequest> {
    const response = await apiClient.patch(`${this.basePath}/leave-requests/${id}/approve`);
    return mapLeaveRequest(response.data);
  }

  async rejectLeaveRequest(id: string, reason?: string): Promise<LeaveRequest> {
    const response = await apiClient.patch(`${this.basePath}/leave-requests/${id}/reject`, { reason });
    return mapLeaveRequest(response.data);
  }

  async getLoans(params?: SearchParams): Promise<PaginatedResponse<Loan>> {
    return {
      data: [],
      pagination: normalizePagination(undefined, 0),
    };
  }

  async createLoan(): Promise<Loan> {
    throw new Error('Not implemented');
  }
}

export const hrService = new HRService();
export default hrService;
