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
