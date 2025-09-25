/** @format */

import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  User,
  Employee,
  Supplier,
  Product,
  Customer,
  Quote,
  Invoice,
  Payment,
  Expense,
  Service,
  Contract,
  Salary,
  LeaveRequest,
  Loan,
  Prospect,
  Mission,
  Intervention,
  Technicien,
  Materiel,
  RapportMission,
  ClientProject,
  ProjectTask,
  PurchaseOrder,
  PurchaseReceipt,
  PerformanceReview,
  CalendarEvent,
  TimeOffRequest,
  Account,
  AccountingEntry,
  CashFlow,
  RecurringInvoice,
  Reminder,
  Notification,
  Message,
  Specialite,
  UserCalendar,
  RolePermission,
  Permission
} from "../types";

// Configuration de l'URL basée sur ton environnement
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Instance principale avec intercepteurs
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Instance sans intercepteurs pour éviter les boucles infinies
const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les réponses et les erreurs
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si le token a expiré, essayer de le rafraîchir
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Utiliser l'instance sans intercepteurs pour éviter les boucles
        const response = await refreshApi.post<ApiResponse<{ token: string }>>(
          "/api/v1/auth/refresh",
          { refreshToken }
        );

        if (!response.data.data?.token) {
          throw new Error("Invalid refresh response: no token received");
        }

        const { token } = response.data.data;
        localStorage.setItem("token", token);

        // Réessayer la requête originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error("Refresh token error:", refreshError);

        // Déconnecter seulement pour les erreurs d'authentification
        if (
          refreshError?.response?.status === 401 ||
          refreshError?.response?.status === 403 ||
          refreshError?.message?.includes("No refresh token") ||
          refreshError?.message?.includes("Invalid refresh response")
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");

          // Éviter la redirection si on est déjà sur la page login
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// SERVICES D'AUTHENTIFICATION ET UTILISATEURS
// ============================================================================

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      "/api/v1/auth/login",
      credentials
    );

    if (!response.data.data) {
      throw new Error("Authentication failed: no data received");
    }

    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch (error) {
      console.warn("Logout API call failed, proceeding with local cleanup");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/api/v1/auth/profile");
    if (!response.data.data) {
      throw new Error("Profile data not available");
    }
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await api.post<ApiResponse<{ token: string }>>(
      "/api/v1/auth/refresh",
      { refreshToken }
    );

    if (!response.data.data) {
      throw new Error("Token refresh failed: no data received");
    }

    return response.data.data;
  },
};

export const userService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    serviceId?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<User[]>> => {
    const response = await api.get<ApiResponse<User[]>>("/api/v1/users", {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/api/v1/users/${id}`);
    return response.data;
  },

  create: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>(
      "/api/v1/users",
      userData
    );
    return response.data;
  },

  update: async (
    id: number,
    userData: Partial<User>
  ): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(
      `/api/v1/users/${id}`,
      userData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/api/v1/users/${id}`);
    return response.data;
  },

  getPermissions: async (userId: number): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>(
      `/api/v1/users/${userId}/permissions`
    );
    return response.data;
  },

  updatePermissions: async (
    userId: number,
    permissions: string[]
  ): Promise<ApiResponse<string[]>> => {
    console.log("📤 Envoi des permissions:", { userId, permissions });
    try {
      const response = await api.put<ApiResponse<string[]>>(
        `/api/v1/users/${userId}/permissions`,
        { permissions }
      );
      console.log("✅ Réponse reçue:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Erreur détaillée:", error);
      throw error;
    }
  },

  getRoles: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>("/api/v1/users/roles");
    return response.data;
  },

  getServices: async (): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>("/api/v1/users/services");
    return response.data;
  },
};

// ============================================================================
// SERVICES RH ET EMPLOYÉS
// ============================================================================

export const employeeService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    serviceId?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Employee[]>> => {
    const response = await api.get<ApiResponse<Employee[]>>(
      "/api/v1/employees",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Employee>> => {
    const response = await api.get<ApiResponse<Employee>>(
      `/api/v1/employees/${id}`
    );
    return response.data;
  },

  create: async (
    employeeData: Partial<Employee>
  ): Promise<ApiResponse<Employee>> => {
    const response = await api.post<ApiResponse<Employee>>(
      "/api/v1/employees",
      employeeData
    );
    return response.data;
  },

  update: async (
    id: number,
    employeeData: Partial<Employee>
  ): Promise<ApiResponse<Employee>> => {
    const response = await api.put<ApiResponse<Employee>>(
      `/api/v1/employees/${id}`,
      employeeData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/employees/${id}`
    );
    return response.data;
  },
};

export const contractService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    contractType?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Contract[]>> => {
    const response = await api.get<ApiResponse<Contract[]>>(
      "/api/v1/contracts",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Contract>> => {
    const response = await api.get<ApiResponse<Contract>>(
      `/api/v1/contracts/${id}`
    );
    return response.data;
  },

  create: async (contractData: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    const response = await api.post<ApiResponse<Contract>>(
      "/api/v1/contracts",
      contractData
    );
    return response.data;
  },

  update: async (
    id: number,
    contractData: Partial<Contract>
  ): Promise<ApiResponse<Contract>> => {
    const response = await api.put<ApiResponse<Contract>>(
      `/api/v1/contracts/${id}`,
      contractData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/contracts/${id}`
    );
    return response.data;
  },
};

export const salaryService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Salary[]>> => {
    const response = await api.get<ApiResponse<Salary[]>>(
      "/api/v1/salaries",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Salary>> => {
    const response = await api.get<ApiResponse<Salary>>(
      `/api/v1/salaries/${id}`
    );
    return response.data;
  },

  create: async (salaryData: Partial<Salary>): Promise<ApiResponse<Salary>> => {
    const response = await api.post<ApiResponse<Salary>>(
      "/api/v1/salaries",
      salaryData
    );
    return response.data;
  },

  update: async (
    id: number,
    salaryData: Partial<Salary>
  ): Promise<ApiResponse<Salary>> => {
    const response = await api.put<ApiResponse<Salary>>(
      `/api/v1/salaries/${id}`,
      salaryData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/salaries/${id}`
    );
    return response.data;
  },
};

export const leaveService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    status?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<LeaveRequest[]>> => {
    const response = await api.get<ApiResponse<LeaveRequest[]>>(
      "/api/v1/leaves",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.get<ApiResponse<LeaveRequest>>(
      `/api/v1/leaves/${id}`
    );
    return response.data;
  },

  create: async (leaveData: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>(
      "/api/v1/leaves",
      leaveData
    );
    return response.data;
  },

  update: async (
    id: number,
    leaveData: Partial<LeaveRequest>
  ): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.put<ApiResponse<LeaveRequest>>(
      `/api/v1/leaves/${id}`,
      leaveData
    );
    return response.data;
  },

  approve: async (id: number, comments?: string): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.patch<ApiResponse<LeaveRequest>>(
      `/api/v1/leaves/${id}/approve`,
      { comments }
    );
    return response.data;
  },

  reject: async (id: number, comments?: string): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.patch<ApiResponse<LeaveRequest>>(
      `/api/v1/leaves/${id}/reject`,
      { comments }
    );
    return response.data;
  },
};

export const loanService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    status?: string;
  }): Promise<ApiResponse<Loan[]>> => {
    const response = await api.get<ApiResponse<Loan[]>>(
      "/api/v1/loans",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Loan>> => {
    const response = await api.get<ApiResponse<Loan>>(
      `/api/v1/loans/${id}`
    );
    return response.data;
  },

  create: async (loanData: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const response = await api.post<ApiResponse<Loan>>(
      "/api/v1/loans",
      loanData
    );
    return response.data;
  },

  update: async (
    id: number,
    loanData: Partial<Loan>
  ): Promise<ApiResponse<Loan>> => {
    const response = await api.put<ApiResponse<Loan>>(
      `/api/v1/loans/${id}`,
      loanData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/loans/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES COMMERCIAUX ET CRM
// ============================================================================

export const customerService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    serviceId?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Customer[]>> => {
    const response = await api.get<ApiResponse<Customer[]>>(
      "/api/v1/customers",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Customer>> => {
    const response = await api.get<ApiResponse<Customer>>(
      `/api/v1/customers/${id}`
    );
    return response.data;
  },

  create: async (customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    const response = await api.post<ApiResponse<Customer>>(
      "/api/v1/customers",
      customerData
    );
    return response.data;
  },

  update: async (
    id: number,
    customerData: Partial<Customer>
  ): Promise<ApiResponse<Customer>> => {
    const response = await api.put<ApiResponse<Customer>>(
      `/api/v1/customers/${id}`,
      customerData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/customers/${id}`
    );
    return response.data;
  },
};

export const prospectService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
    priority?: string;
    assignedTo?: number;
  }): Promise<ApiResponse<Prospect[]>> => {
    const response = await api.get<ApiResponse<Prospect[]>>(
      "/api/v1/prospects",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Prospect>> => {
    const response = await api.get<ApiResponse<Prospect>>(
      `/api/v1/prospects/${id}`
    );
    return response.data;
  },

  create: async (prospectData: Partial<Prospect>): Promise<ApiResponse<Prospect>> => {
    const response = await api.post<ApiResponse<Prospect>>(
      "/api/v1/prospects",
      prospectData
    );
    return response.data;
  },

  update: async (
    id: number,
    prospectData: Partial<Prospect>
  ): Promise<ApiResponse<Prospect>> => {
    const response = await api.put<ApiResponse<Prospect>>(
      `/api/v1/prospects/${id}`,
      prospectData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/prospects/${id}`
    );
    return response.data;
  },

  moveStage: async (id: number, stage: string, notes?: string): Promise<ApiResponse<Prospect>> => {
    const response = await api.post<ApiResponse<Prospect>>(
      `/api/v1/prospects/${id}/move`,
      { stage, notes }
    );
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      "/api/v1/prospects/stats"
    );
    return response.data;
  },
};

export const quoteService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: number;
    status?: string;
    quoteType?: string;
  }): Promise<ApiResponse<Quote[]>> => {
    const response = await api.get<ApiResponse<Quote[]>>(
      "/api/v1/quotes",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Quote>> => {
    const response = await api.get<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}`
    );
    return response.data;
  },

  create: async (quoteData: Partial<Quote>): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(
      "/api/v1/quotes",
      quoteData
    );
    return response.data;
  },

  update: async (
    id: number,
    quoteData: Partial<Quote>
  ): Promise<ApiResponse<Quote>> => {
    const response = await api.put<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}`,
      quoteData
    );
    return response.data;
  },

  submitForApproval: async (id: number): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}/submit`
    );
    return response.data;
  },

  approveService: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}/approve-service`,
      { comments }
    );
    return response.data;
  },

  approveDG: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}/approve-dg`,
      { comments }
    );
    return response.data;
  },

  reject: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(
      `/api/v1/quotes/${id}/reject`,
      { comments }
    );
    return response.data;
  },
};

export const invoiceService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<Invoice[]>> => {
    const response = await api.get<ApiResponse<Invoice[]>>(
      "/api/v1/invoices",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.get<ApiResponse<Invoice>>(
      `/api/v1/invoices/${id}`
    );
    return response.data;
  },

  create: async (invoiceData: Partial<Invoice>): Promise<ApiResponse<Invoice>> => {
    const response = await api.post<ApiResponse<Invoice>>(
      "/api/v1/invoices",
      invoiceData
    );
    return response.data;
  },

  update: async (
    id: number,
    invoiceData: Partial<Invoice>
  ): Promise<ApiResponse<Invoice>> => {
    const response = await api.put<ApiResponse<Invoice>>(
      `/api/v1/invoices/${id}`,
      invoiceData
    );
    return response.data;
  },

  send: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.post<ApiResponse<Invoice>>(
      `/api/v1/invoices/${id}/send`
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/invoices/${id}`
    );
    return response.data;
  },
};

export const paymentService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    customerId?: number;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Payment[]>> => {
    const response = await api.get<ApiResponse<Payment[]>>(
      "/api/v1/payments",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Payment>> => {
    const response = await api.get<ApiResponse<Payment>>(
      `/api/v1/payments/${id}`
    );
    return response.data;
  },

  create: async (paymentData: Partial<Payment>): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>(
      "/api/v1/payments",
      paymentData
    );
    return response.data;
  },

  update: async (
    id: number,
    paymentData: Partial<Payment>
  ): Promise<ApiResponse<Payment>> => {
    const response = await api.put<ApiResponse<Payment>>(
      `/api/v1/payments/${id}`,
      paymentData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/payments/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES TECHNIQUES ET MISSIONS
// ============================================================================

export const missionService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    clientId?: number;
    statut?: string;
    priorite?: string;
  }): Promise<ApiResponse<Mission[]>> => {
    const response = await api.get<ApiResponse<Mission[]>>(
      "/api/v1/missions",
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Mission>> => {
    const response = await api.get<ApiResponse<Mission>>(
      `/api/v1/missions/${id}`
    );
    return response.data;
  },

  create: async (missionData: Partial<Mission>): Promise<ApiResponse<Mission>> => {
    const response = await api.post<ApiResponse<Mission>>(
      "/api/v1/missions",
      missionData
    );
    return response.data;
  },

  update: async (
    id: string,
    missionData: Partial<Mission>
  ): Promise<ApiResponse<Mission>> => {
    const response = await api.put<ApiResponse<Mission>>(
      `/api/v1/missions/${id}`,
      missionData
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/missions/${id}`
    );
    return response.data;
  },
};

export const interventionService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    missionId?: string;
    technicienId?: number;
    statut?: string;
  }): Promise<ApiResponse<Intervention[]>> => {
    const response = await api.get<ApiResponse<Intervention[]>>(
      "/api/v1/interventions",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Intervention>> => {
    const response = await api.get<ApiResponse<Intervention>>(
      `/api/v1/interventions/${id}`
    );
    return response.data;
  },

  create: async (interventionData: Partial<Intervention>): Promise<ApiResponse<Intervention>> => {
    const response = await api.post<ApiResponse<Intervention>>(
      "/api/v1/interventions",
      interventionData
    );
    return response.data;
  },

  update: async (
    id: number,
    interventionData: Partial<Intervention>
  ): Promise<ApiResponse<Intervention>> => {
    const response = await api.put<ApiResponse<Intervention>>(
      `/api/v1/interventions/${id}`,
      interventionData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/interventions/${id}`
    );
    return response.data;
  },
};

export const technicienService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    specialiteId?: number;
    isActive?: boolean;
    status?: string;
  }): Promise<ApiResponse<Technicien[]>> => {
    const response = await api.get<ApiResponse<Technicien[]>>(
      "/api/v1/techniciens",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Technicien>> => {
    const response = await api.get<ApiResponse<Technicien>>(
      `/api/v1/techniciens/${id}`
    );
    return response.data;
  },

  create: async (technicienData: Partial<Technicien>): Promise<ApiResponse<Technicien>> => {
    const response = await api.post<ApiResponse<Technicien>>(
      "/api/v1/techniciens",
      technicienData
    );
    return response.data;
  },

  update: async (
    id: number,
    technicienData: Partial<Technicien>
  ): Promise<ApiResponse<Technicien>> => {
    const response = await api.put<ApiResponse<Technicien>>(
      `/api/v1/techniciens/${id}`,
      technicienData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/techniciens/${id}`
    );
    return response.data;
  },
};

export const materielService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categorie?: string;
    statut?: string;
  }): Promise<ApiResponse<Materiel[]>> => {
    const response = await api.get<ApiResponse<Materiel[]>>(
      "/api/v1/materiels",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Materiel>> => {
    const response = await api.get<ApiResponse<Materiel>>(
      `/api/v1/materiels/${id}`
    );
    return response.data;
  },

  create: async (materielData: Partial<Materiel>): Promise<ApiResponse<Materiel>> => {
    const response = await api.post<ApiResponse<Materiel>>(
      "/api/v1/materiels",
      materielData
    );
    return response.data;
  },

  update: async (
    id: number,
    materielData: Partial<Materiel>
  ): Promise<ApiResponse<Materiel>> => {
    const response = await api.put<ApiResponse<Materiel>>(
      `/api/v1/materiels/${id}`,
      materielData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/materiels/${id}`
    );
    return response.data;
  },
};

export const rapportService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    missionId?: string;
    technicienId?: number;
    statut?: string;
  }): Promise<ApiResponse<RapportMission[]>> => {
    const response = await api.get<ApiResponse<RapportMission[]>>(
      "/api/v1/rapports",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<RapportMission>> => {
    const response = await api.get<ApiResponse<RapportMission>>(
      `/api/v1/rapports/${id}`
    );
    return response.data;
  },

  create: async (rapportData: Partial<RapportMission>): Promise<ApiResponse<RapportMission>> => {
    const response = await api.post<ApiResponse<RapportMission>>(
      "/api/v1/rapports",
      rapportData
    );
    return response.data;
  },

  update: async (
    id: number,
    rapportData: Partial<RapportMission>
  ): Promise<ApiResponse<RapportMission>> => {
    const response = await api.put<ApiResponse<RapportMission>>(
      `/api/v1/rapports/${id}`,
      rapportData
    );
    return response.data;
  },

  validate: async (id: number, commentaire?: string): Promise<ApiResponse<RapportMission>> => {
    const response = await api.post<ApiResponse<RapportMission>>(
      `/api/v1/rapports/${id}/validate`,
      { commentaire }
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/rapports/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES ACHATS ET FOURNISSEURS
// ============================================================================

export const supplierService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<Supplier[]>> => {
    const response = await api.get<ApiResponse<Supplier[]>>(
      "/api/v1/suppliers",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Supplier>> => {
    const response = await api.get<ApiResponse<Supplier>>(
      `/api/v1/suppliers/${id}`
    );
    return response.data;
  },

  create: async (supplierData: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    const response = await api.post<ApiResponse<Supplier>>(
      "/api/v1/suppliers",
      supplierData
    );
    return response.data;
  },

  update: async (
    id: number,
    supplierData: Partial<Supplier>
  ): Promise<ApiResponse<Supplier>> => {
    const response = await api.put<ApiResponse<Supplier>>(
      `/api/v1/suppliers/${id}`,
      supplierData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/suppliers/${id}`
    );
    return response.data;
  },
};

export const purchaseService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    supplierId?: number;
    status?: string;
    serviceId?: number;
  }): Promise<ApiResponse<PurchaseOrder[]>> => {
    const response = await api.get<ApiResponse<PurchaseOrder[]>>(
      "/api/v1/purchases",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.get<ApiResponse<PurchaseOrder>>(
      `/api/v1/purchases/${id}`
    );
    return response.data;
  },

  create: async (purchaseData: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.post<ApiResponse<PurchaseOrder>>(
      "/api/v1/purchases",
      purchaseData
    );
    return response.data;
  },

  update: async (
    id: number,
    purchaseData: Partial<PurchaseOrder>
  ): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.put<ApiResponse<PurchaseOrder>>(
      `/api/v1/purchases/${id}`,
      purchaseData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/purchases/${id}`
    );
    return response.data;
  },
};

export const purchaseReceiptService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    purchaseOrderId?: number;
  }): Promise<ApiResponse<PurchaseReceipt[]>> => {
    const response = await api.get<ApiResponse<PurchaseReceipt[]>>(
      "/api/v1/purchase-receipts",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<PurchaseReceipt>> => {
    const response = await api.get<ApiResponse<PurchaseReceipt>>(
      `/api/v1/purchase-receipts/${id}`
    );
    return response.data;
  },

  create: async (receiptData: Partial<PurchaseReceipt>): Promise<ApiResponse<PurchaseReceipt>> => {
    const response = await api.post<ApiResponse<PurchaseReceipt>>(
      "/api/v1/purchase-receipts",
      receiptData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/purchase-receipts/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES PROJETS ET PLANNING
// ============================================================================

export const projectService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: number;
    status?: string;
    serviceId?: number;
  }): Promise<ApiResponse<ClientProject[]>> => {
    const response = await api.get<ApiResponse<ClientProject[]>>(
      "/api/v1/projects",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<ClientProject>> => {
    const response = await api.get<ApiResponse<ClientProject>>(
      `/api/v1/projects/${id}`
    );
    return response.data;
  },

  create: async (projectData: Partial<ClientProject>): Promise<ApiResponse<ClientProject>> => {
    const response = await api.post<ApiResponse<ClientProject>>(
      "/api/v1/projects",
      projectData
    );
    return response.data;
  },

  update: async (
    id: number,
    projectData: Partial<ClientProject>
  ): Promise<ApiResponse<ClientProject>> => {
    const response = await api.put<ApiResponse<ClientProject>>(
      `/api/v1/projects/${id}`,
      projectData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/projects/${id}`
    );
    return response.data;
  },
};

export const calendarService = {
  // Événements calendrier
  getEvents: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    calendarId?: number;
  }): Promise<ApiResponse<CalendarEvent[]>> => {
    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      "/api/v1/calendar/events",
      { params }
    );
    return response.data;
  },

  getEventsWithTimeOffs: async (params?: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    includeTimeOffs?: boolean;
  }): Promise<ApiResponse<{ events: CalendarEvent[], timeOffs: TimeOffRequest[] }>> => {
    const response = await api.get<ApiResponse<{ events: CalendarEvent[], timeOffs: TimeOffRequest[] }>>(
      "/api/v1/calendar/with-timeoffs",
      { params }
    );
    return response.data;
  },

  createEvent: async (eventData: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> => {
    const response = await api.post<ApiResponse<CalendarEvent>>(
      "/api/v1/calendar/events",
      eventData
    );
    return response.data;
  },

  updateEvent: async (
    id: number,
    eventData: Partial<CalendarEvent>
  ): Promise<ApiResponse<CalendarEvent>> => {
    const response = await api.put<ApiResponse<CalendarEvent>>(
      `/api/v1/calendar/events/${id}`,
      eventData
    );
    return response.data;
  },

  deleteEvent: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/calendar/events/${id}`
    );
    return response.data;
  },

  // Time Offs (Missions, Absences, Déplacements)
  getTimeOffs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<TimeOffRequest[]>> => {
    const response = await api.get<ApiResponse<TimeOffRequest[]>>(
      "/api/v1/time-off",
      { params }
    );
    return response.data;
  },

  createTimeOff: async (timeOffData: Partial<TimeOffRequest>): Promise<ApiResponse<{ event: CalendarEvent, timeOff: TimeOffRequest }>> => {
    const response = await api.post<ApiResponse<{ event: CalendarEvent, timeOff: TimeOffRequest }>>(
      "/api/v1/time-off",
      timeOffData
    );
    return response.data;
  },

  updateTimeOffStatus: async (
    id: number,
    statusData: { status: string; comments?: string; approvedById?: number }
  ): Promise<ApiResponse<TimeOffRequest>> => {
    const response = await api.patch<ApiResponse<TimeOffRequest>>(
      `/api/v1/time-off/${id}/status`,
      statusData
    );
    return response.data;
  },

  getTimeOffStats: async (params?: {
    userId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      "/api/v1/time-off/stats",
      { params }
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES COMPTABILITÉ ET FINANCE
// ============================================================================

export const accountService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    accountType?: string;
  }): Promise<ApiResponse<Account[]>> => {
    const response = await api.get<ApiResponse<Account[]>>(
      "/api/v1/comptes",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Account>> => {
    const response = await api.get<ApiResponse<Account>>(
      `/api/v1/comptes/${id}`
    );
    return response.data;
  },

  create: async (accountData: Partial<Account>): Promise<ApiResponse<Account>> => {
    const response = await api.post<ApiResponse<Account>>(
      "/api/v1/comptes",
      accountData
    );
    return response.data;
  },

  update: async (
    id: number,
    accountData: Partial<Account>
  ): Promise<ApiResponse<Account>> => {
    const response = await api.put<ApiResponse<Account>>(
      `/api/v1/comptes/${id}`,
      accountData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/comptes/${id}`
    );
    return response.data;
  },
};

export const accountingEntryService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    accountId?: number;
    entryType?: string;
  }): Promise<ApiResponse<AccountingEntry[]>> => {
    const response = await api.get<ApiResponse<AccountingEntry[]>>(
      "/api/v1/ecritures-comptables",
      { params }
    );
    return response.data;
  },

  create: async (entryData: Partial<AccountingEntry>): Promise<ApiResponse<AccountingEntry>> => {
    const response = await api.post<ApiResponse<AccountingEntry>>(
      "/api/v1/ecritures-comptables",
      entryData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/ecritures-comptables/${id}`
    );
    return response.data;
  },
};

export const cashFlowService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    accountId?: number;
    type?: string;
  }): Promise<ApiResponse<CashFlow[]>> => {
    const response = await api.get<ApiResponse<CashFlow[]>>(
      "/api/v1/tresorerie",
      { params }
    );
    return response.data;
  },

  create: async (cashFlowData: Partial<CashFlow>): Promise<ApiResponse<CashFlow>> => {
    const response = await api.post<ApiResponse<CashFlow>>(
      "/api/v1/tresorerie",
      cashFlowData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/tresorerie/${id}`
    );
    return response.data;
  },
};

export const expenseService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    employeeId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Expense[]>> => {
    const response = await api.get<ApiResponse<Expense[]>>(
      "/api/v1/expenses",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Expense>> => {
    const response = await api.get<ApiResponse<Expense>>(
      `/api/v1/expenses/${id}`
    );
    return response.data;
  },

  create: async (expenseData: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    const response = await api.post<ApiResponse<Expense>>(
      "/api/v1/expenses",
      expenseData
    );
    return response.data;
  },

  update: async (
    id: number,
    expenseData: Partial<Expense>
  ): Promise<ApiResponse<Expense>> => {
    const response = await api.put<ApiResponse<Expense>>(
      `/api/v1/expenses/${id}`,
      expenseData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/expenses/${id}`
    );
    return response.data;
  },

  getCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>(
      "/api/v1/expenses/categories"
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES ADMINISTRATION ET RAPPORTS
// ============================================================================

export const serviceService = {
  getAll: async (params?: {
    search?: string;
  }): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>(
      "/api/v1/services",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Service>> => {
    const response = await api.get<ApiResponse<Service>>(
      `/api/v1/services/${id}`
    );
    return response.data;
  },

  create: async (serviceData: Partial<Service>): Promise<ApiResponse<Service>> => {
    const response = await api.post<ApiResponse<Service>>(
      "/api/v1/services",
      serviceData
    );
    return response.data;
  },

  update: async (
    id: number,
    serviceData: Partial<Service>
  ): Promise<ApiResponse<Service>> => {
    const response = await api.put<ApiResponse<Service>>(
      `/api/v1/services/${id}`,
      serviceData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/services/${id}`
    );
    return response.data;
  },
};

export const permissionService = {
  getAll: async (): Promise<ApiResponse<Permission[]>> => {
    const response = await api.get<ApiResponse<Permission[]>>(
      "/api/v1/permissions"
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Permission>> => {
    const response = await api.get<ApiResponse<Permission>>(
      `/api/v1/permissions/${id}`
    );
    return response.data;
  },

  update: async (
    id: number,
    permissionData: Partial<Permission>
  ): Promise<ApiResponse<Permission>> => {
    const response = await api.put<ApiResponse<Permission>>(
      `/api/v1/permissions/${id}`,
      permissionData
    );
    return response.data;
  },
};

export const reportService = {
  getFinancialReports: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      "/api/v1/reports/financial",
      { params }
    );
    return response.data;
  },

  getSalesReports: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      "/api/v1/reports/sales",
      { params }
    );
    return response.data;
  },

  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    userId?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(
      "/api/v1/reports/audit",
      { params }
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES PRODUITS ET CATALOGUE
// ============================================================================

export const productService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    type?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product[]>> => {
    const response = await api.get<ApiResponse<Product[]>>(
      "/api/v1/products",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Product>> => {
    const response = await api.get<ApiResponse<Product>>(
      `/api/v1/products/${id}`
    );
    return response.data;
  },

  create: async (productData: Partial<Product>): Promise<ApiResponse<Product>> => {
    const response = await api.post<ApiResponse<Product>>(
      "/api/v1/products",
      productData
    );
    return response.data;
  },

  update: async (
    id: number,
    productData: Partial<Product>
  ): Promise<ApiResponse<Product>> => {
    const response = await api.put<ApiResponse<Product>>(
      `/api/v1/products/${id}`,
      productData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/products/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES SPÉCIALITÉS ET TECHNICAL
// ============================================================================

export const specialiteService = {
  getAll: async (): Promise<ApiResponse<Specialite[]>> => {
    const response = await api.get<ApiResponse<Specialite[]>>(
      "/api/v1/specialites"
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Specialite>> => {
    const response = await api.get<ApiResponse<Specialite>>(
      `/api/v1/specialites/${id}`
    );
    return response.data;
  },

  create: async (specialiteData: Partial<Specialite>): Promise<ApiResponse<Specialite>> => {
    const response = await api.post<ApiResponse<Specialite>>(
      "/api/v1/specialites",
      specialiteData
    );
    return response.data;
  },

  update: async (
    id: number,
    specialiteData: Partial<Specialite>
  ): Promise<ApiResponse<Specialite>> => {
    const response = await api.put<ApiResponse<Specialite>>(
      `/api/v1/specialites/${id}`,
      specialiteData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/specialites/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES DE PERFORMANCE ET ÉVALUATIONS
// ============================================================================

export const performanceService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PerformanceReview[]>> => {
    const response = await api.get<ApiResponse<PerformanceReview[]>>(
      "/api/v1/performance",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<PerformanceReview>> => {
    const response = await api.get<ApiResponse<PerformanceReview>>(
      `/api/v1/performance/${id}`
    );
    return response.data;
  },

  create: async (reviewData: Partial<PerformanceReview>): Promise<ApiResponse<PerformanceReview>> => {
    const response = await api.post<ApiResponse<PerformanceReview>>(
      "/api/v1/performance",
      reviewData
    );
    return response.data;
  },

  update: async (
    id: number,
    reviewData: Partial<PerformanceReview>
  ): Promise<ApiResponse<PerformanceReview>> => {
    const response = await api.put<ApiResponse<PerformanceReview>>(
      `/api/v1/performance/${id}`,
      reviewData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/performance/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES DE COMMUNICATION
// ============================================================================

export const messageService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    recipientId?: number;
    isRead?: boolean;
  }): Promise<ApiResponse<Message[]>> => {
    const response = await api.get<ApiResponse<Message[]>>(
      "/api/v1/messages",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Message>> => {
    const response = await api.get<ApiResponse<Message>>(
      `/api/v1/messages/${id}`
    );
    return response.data;
  },

  create: async (messageData: Partial<Message>): Promise<ApiResponse<Message>> => {
    const response = await api.post<ApiResponse<Message>>(
      "/api/v1/messages",
      messageData
    );
    return response.data;
  },

  update: async (
    id: number,
    messageData: Partial<Message>
  ): Promise<ApiResponse<Message>> => {
    const response = await api.put<ApiResponse<Message>>(
      `/api/v1/messages/${id}`,
      messageData
    );
    return response.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<Message>> => {
    const response = await api.patch<ApiResponse<Message>>(
      `/api/v1/messages/${id}/read`
    );
    return response.data;
  },
};

export const notificationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<ApiResponse<Notification[]>> => {
    const response = await api.get<ApiResponse<Notification[]>>(
      "/api/v1/notifications",
      { params }
    );
    return response.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<Notification>> => {
    const response = await api.patch<ApiResponse<Notification>>(
      `/api/v1/notifications/${id}/read`
    );
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    const response = await api.patch<ApiResponse<void>>(
      "/api/v1/notifications/read-all"
    );
    return response.data;
  },
};

// ============================================================================
// SERVICES FACTURATION RÉCURRENTE ET RELANCES
// ============================================================================

export const recurringInvoiceService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    customerId?: number;
    frequency?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<RecurringInvoice[]>> => {
    const response = await api.get<ApiResponse<RecurringInvoice[]>>(
      "/api/v1/recurring-invoices",
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<RecurringInvoice>> => {
    const response = await api.get<ApiResponse<RecurringInvoice>>(
      `/api/v1/recurring-invoices/${id}`
    );
    return response.data;
  },

  create: async (invoiceData: Partial<RecurringInvoice>): Promise<ApiResponse<RecurringInvoice>> => {
    const response = await api.post<ApiResponse<RecurringInvoice>>(
      "/api/v1/recurring-invoices",
      invoiceData
    );
    return response.data;
  },

  update: async (
    id: number,
    invoiceData: Partial<RecurringInvoice>
  ): Promise<ApiResponse<RecurringInvoice>> => {
    const response = await api.put<ApiResponse<RecurringInvoice>>(
      `/api/v1/recurring-invoices/${id}`,
      invoiceData
    );
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/recurring-invoices/${id}`
    );
    return response.data;
  },
};

export const reminderService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    invoiceId?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<Reminder[]>> => {
    const response = await api.get<ApiResponse<Reminder[]>>(
      "/api/v1/reminders",
      { params }
    );
    return response.data;
  },

  create: async (reminderData: Partial<Reminder>): Promise<ApiResponse<Reminder>> => {
    const response = await api.post<ApiResponse<Reminder>>(
      "/api/v1/reminders",
      reminderData
    );
    return response.data;
  },

  updateStatus: async (
    id: number,
    status: string
  ): Promise<ApiResponse<Reminder>> => {
    const response = await api.patch<ApiResponse<Reminder>>(
      `/api/v1/reminders/${id}/status`,
      { status }
    );
    return response.data;
  },
};

// ============================================================================
// UTILITAIRES ET GESTION D'ERREURS
// ============================================================================

// Service générique pour les opérations CRUD (fallback)
export const createCrudService = <T>(endpoint: string) => ({
  getAll: async (
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T[]>> => {
    const response = await api.get<ApiResponse<T[]>>(`/api/v1/${endpoint}`, {
      params,
    });
    return response.data;
  },

  getById: async (id: number | string): Promise<ApiResponse<T>> => {
    const response = await api.get<ApiResponse<T>>(`/api/v1/${endpoint}/${id}`);
    return response.data;
  },

  create: async (data: Partial<T>): Promise<ApiResponse<T>> => {
    const response = await api.post<ApiResponse<T>>(
      `/api/v1/${endpoint}`,
      data
    );
    return response.data;
  },

  update: async (
    id: number | string,
    data: Partial<T>
  ): Promise<ApiResponse<T>> => {
    const response = await api.put<ApiResponse<T>>(
      `/api/v1/${endpoint}/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: number | string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/${endpoint}/${id}`
    );
    return response.data;
  },
});

// Utilitaires pour la gestion des tokens
export const tokenUtils = {
  getToken: (): string | null => localStorage.getItem("token"),
  getRefreshToken: (): string | null => localStorage.getItem("refreshToken"),
  setTokens: (token: string, refreshToken: string): void => {
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
  },
  clearTokens: (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem("token");
    return !!token;
  },
};

// Gestionnaire d'erreurs global
export const apiErrorHandler = {
  handleError: (error: unknown): never => {
    const axiosError = error as {
      response?: {
        status: number;
        data?: {
          message?: string;
          error?: string;
        };
      };
      message?: string;
    };

    if (axiosError.response) {
      const status = axiosError.response.status;
      const message =
        axiosError.response.data?.message ||
        axiosError.response.data?.error ||
        "Server error";

      switch (status) {
        case 400:
          throw new Error(`Bad Request: ${message}`);
        case 401:
          throw new Error("Unauthorized: Please login again");
        case 403:
          throw new Error("Forbidden: You don't have permission");
        case 404:
          throw new Error("Resource not found");
        case 409:
          throw new Error(`Conflict: ${message}`);
        case 422:
          throw new Error(`Validation Error: ${message}`);
        case 500:
          throw new Error("Server error: Please try again later");
        case 502:
          throw new Error("Bad Gateway: Server is unavailable");
        case 503:
          throw new Error("Service Unavailable: Server is under maintenance");
        default:
          throw new Error(`Error ${status}: ${message}`);
      }
    } else if (axiosError.message) {
      throw new Error(`Network error: ${axiosError.message}`);
    } else {
      throw new Error("An unexpected error occurred");
    }
  },
};

// Export de tous les services
export default api;