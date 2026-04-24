export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  nationality?: string;
  cnpsNumber?: string;
  cnamNumber?: string;
  position: string;
  department: string;
  hireDate: string;
  employmentStatus: string;
  isActive: boolean;
  salary?: number;
  matricule?: string;
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
  benefits?: string;
  clauses?: string;
  signedDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    firstName?: string;
    lastName?: string;
    matricule?: string;
  };
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

export interface PayrollComplianceMetric {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'critical';
  value: string;
  description: string;
}

export interface PayrollFeatureStatus {
  key: string;
  label: string;
  available: boolean;
  description: string;
}

export interface PayrollOverview {
  period: {
    month: number;
    year: number;
    label: string;
  };
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    coveredEmployees: number;
    missingCnpsCount: number;
    missingCnamCount: number;
    supportedInitialRange: string;
    supportedScale: number;
  };
  payroll: {
    bulletinsCount: number;
    validatedCount: number;
    paidCount: number;
    totalGross: number;
    totalNet: number;
    totalEmployerCost: number;
    totalTaxes: number;
    totalEmployeeContributions: number;
  };
  compliance: PayrollComplianceMetric[];
  features: PayrollFeatureStatus[];
  legalRates: Array<{
    key: string;
    label: string;
    value: number | string;
    unit?: string;
  }>;
  declarations: Array<{
    key: string;
    label: string;
    format: string;
    description: string;
  }>;
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
  employeId: string;
  type: 'AVANCE' | 'PRET';
  motif?: string;
  montantInitial: number;
  restantDu: number;
  deductionMensuelle: number;
  dateDebut: string;
  dateFin?: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
  employe?: { nom?: string; prenom?: string; departement?: string };
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  nationality?: string;
  cnpsNumber?: string;
  cnamNumber?: string;
  position: string;
  department: string;
  hireDate: string;
  salary: number;
  matricule?: string;
  isActive?: boolean;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  nationality?: string;
  cnpsNumber?: string;
  cnamNumber?: string;
  position?: string;
  department?: string;
  employmentStatus?: string;
  salary?: number;
  matricule?: string;
  isActive?: boolean;
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
  benefits?: string;
  clauses?: string;
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
  employeId: string;
  type: 'AVANCE' | 'PRET';
  motif?: string;
  montantInitial: number;
  deductionMensuelle: number;
  dateDebut: string;
  dateFin?: string;
}
