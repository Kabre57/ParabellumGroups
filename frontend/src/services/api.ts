import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  User,
  Employee,
  Supplier,
  Product,
  // Types basés sur votre schema Prisma - ajustez selon vos besoins
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
  PurchaseOrder,
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
  Permission
} from "../types";

// Configuration de l'URL basée sur ton environnement
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

// Instance sans intercepteurs pour éviter les boucles infinies
const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Instance principale avec intercepteurs
const api = axios.create({
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

        const response = await refreshApi.post<ApiResponse<{ token: string }>>(
          "/auth/refresh",
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

        if (
          refreshError?.response?.status === 401 ||
          refreshError?.response?.status === 403 ||
          refreshError?.message?.includes("No refresh token") ||
          refreshError?.message?.includes("Invalid refresh response")
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");

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

// Intercepteur pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 404) {
      console.warn('Route non trouvée - Vérifier la configuration backend');
    } else if (error.response?.status === 500) {
      console.error('Erreur serveur - Contacter l\'administrateur');
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// SERVICES D'AUTHENTIFICATION ET UTILISATEURS
// ============================================================================

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials);
    if (!response.data.data) {
      throw new Error("Authentication failed: no data received");
    }
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.warn("Logout API call failed, proceeding with local cleanup");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/auth/profile");
    if (!response.data.data) {
      throw new Error("Profile data not available");
    }
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await api.post<ApiResponse<{ token: string }>>("/auth/refresh", { refreshToken });
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
    const response = await api.get<ApiResponse<User[]>>("/users", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  create: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>("/users", userData);
    return response.data;
  },

  update: async (id: number, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  },

  getPermissions: async (userId: number): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>(`/users/${userId}/permissions`);
    return response.data;
  },

  updatePermissions: async (userId: number, permissions: string[]): Promise<ApiResponse<string[]>> => {
    console.log("📤 Envoi des permissions:", { userId, permissions });
    try {
      const response = await api.put<ApiResponse<string[]>>(`/users/${userId}/permissions`, { permissions });
      console.log("✅ Réponse reçue:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Erreur détaillée:", error);
      throw error;
    }
  },

  getRoles: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>("/users/roles");
    return response.data;
  },

  getServices: async (): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>("/users/services");
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
    const response = await api.get<ApiResponse<Employee[]>>("/employees", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Employee>> => {
    const response = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
    return response.data;
  },

  create: async (employeeData: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    const response = await api.post<ApiResponse<Employee>>("/employees", employeeData);
    return response.data;
  },

  update: async (id: number, employeeData: Partial<Employee>): Promise<ApiResponse<Employee>> => {
    const response = await api.put<ApiResponse<Employee>>(`/employees/${id}`, employeeData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/employees/${id}`);
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
    const response = await api.get<ApiResponse<Contract[]>>("/contracts", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Contract>> => {
    const response = await api.get<ApiResponse<Contract>>(`/contracts/${id}`);
    return response.data;
  },

  create: async (contractData: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    const response = await api.post<ApiResponse<Contract>>("/contracts", contractData);
    return response.data;
  },

  update: async (id: number, contractData: Partial<Contract>): Promise<ApiResponse<Contract>> => {
    const response = await api.put<ApiResponse<Contract>>(`/contracts/${id}`, contractData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/contracts/${id}`);
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
    const response = await api.get<ApiResponse<Salary[]>>("/salaries", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Salary>> => {
    const response = await api.get<ApiResponse<Salary>>(`/salaries/${id}`);
    return response.data;
  },

  create: async (salaryData: Partial<Salary>): Promise<ApiResponse<Salary>> => {
    const response = await api.post<ApiResponse<Salary>>("/salaries", salaryData);
    return response.data;
  },

  update: async (id: number, salaryData: Partial<Salary>): Promise<ApiResponse<Salary>> => {
    const response = await api.put<ApiResponse<Salary>>(`/salaries/${id}`, salaryData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/salaries/${id}`);
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
    const response = await api.get<ApiResponse<LeaveRequest[]>>("/leaves", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.get<ApiResponse<LeaveRequest>>(`/leaves/${id}`);
    return response.data;
  },

  create: async (leaveData: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.post<ApiResponse<LeaveRequest>>("/leaves", leaveData);
    return response.data;
  },

  update: async (id: number, leaveData: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}`, leaveData);
    return response.data;
  },

  approve: async (id: number, comments?: string): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.patch<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`, { comments });
    return response.data;
  },

  reject: async (id: number, comments?: string): Promise<ApiResponse<LeaveRequest>> => {
    const response = await api.patch<ApiResponse<LeaveRequest>>(`/leaves/${id}/reject`, { comments });
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
    const response = await api.get<ApiResponse<Loan[]>>("/loans", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Loan>> => {
    const response = await api.get<ApiResponse<Loan>>(`/loans/${id}`);
    return response.data;
  },

  create: async (loanData: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const response = await api.post<ApiResponse<Loan>>("/loans", loanData);
    return response.data;
  },

  update: async (id: number, loanData: Partial<Loan>): Promise<ApiResponse<Loan>> => {
    const response = await api.put<ApiResponse<Loan>>(`/loans/${id}`, loanData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/loans/${id}`);
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
    const response = await api.get<ApiResponse<Customer[]>>("/customers", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Customer>> => {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data;
  },

  create: async (customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    const response = await api.post<ApiResponse<Customer>>("/customers", customerData);
    return response.data;
  },

  update: async (id: number, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, customerData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/customers/${id}`);
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
    const response = await api.get<ApiResponse<Prospect[]>>("/prospects", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Prospect>> => {
    const response = await api.get<ApiResponse<Prospect>>(`/prospects/${id}`);
    return response.data;
  },

  create: async (prospectData: Partial<Prospect>): Promise<ApiResponse<Prospect>> => {
    const response = await api.post<ApiResponse<Prospect>>("/prospects", prospectData);
    return response.data;
  },

  update: async (id: number, prospectData: Partial<Prospect>): Promise<ApiResponse<Prospect>> => {
    const response = await api.put<ApiResponse<Prospect>>(`/prospects/${id}`, prospectData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/prospects/${id}`);
    return response.data;
  },

  moveStage: async (id: number, stage: string, notes?: string): Promise<ApiResponse<Prospect>> => {
    const response = await api.post<ApiResponse<Prospect>>(`/prospects/${id}/move`, { stage, notes });
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>("/prospects/stats");
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
    const response = await api.get<ApiResponse<Quote[]>>("/quotes", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Quote>> => {
    const response = await api.get<ApiResponse<Quote>>(`/quotes/${id}`);
    return response.data;
  },

  create: async (quoteData: Partial<Quote>): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>("/quotes", quoteData);
    return response.data;
  },

  update: async (id: number, quoteData: Partial<Quote>): Promise<ApiResponse<Quote>> => {
    const response = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, quoteData);
    return response.data;
  },

  submitForApproval: async (id: number): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/submit`);
    return response.data;
  },

  approveService: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/approve-service`, { comments });
    return response.data;
  },

  approveDG: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/approve-dg`, { comments });
    return response.data;
  },

  reject: async (id: number, comments?: string): Promise<ApiResponse<Quote>> => {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/reject`, { comments });
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
    const response = await api.get<ApiResponse<Invoice[]>>("/invoices", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return response.data;
  },

  create: async (invoiceData: Partial<Invoice>): Promise<ApiResponse<Invoice>> => {
    const response = await api.post<ApiResponse<Invoice>>("/invoices", invoiceData);
    return response.data;
  },

  update: async (id: number, invoiceData: Partial<Invoice>): Promise<ApiResponse<Invoice>> => {
    const response = await api.put<ApiResponse<Invoice>>(`/invoices/${id}`, invoiceData);
    return response.data;
  },

  send: async (id: number): Promise<ApiResponse<Invoice>> => {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/send`);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/invoices/${id}`);
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
    const response = await api.get<ApiResponse<Payment[]>>("/payments", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Payment>> => {
    const response = await api.get<ApiResponse<Payment>>(`/payments/${id}`);
    return response.data;
  },

  create: async (paymentData: Partial<Payment>): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>("/payments", paymentData);
    return response.data;
  },

  update: async (id: number, paymentData: Partial<Payment>): Promise<ApiResponse<Payment>> => {
    const response = await api.put<ApiResponse<Payment>>(`/payments/${id}`, paymentData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/payments/${id}`);
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
    const response = await api.get<ApiResponse<Mission[]>>("/missions", { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Mission>> => {
    const response = await api.get<ApiResponse<Mission>>(`/missions/${id}`);
    return response.data;
  },

  create: async (missionData: Partial<Mission>): Promise<ApiResponse<Mission>> => {
    const response = await api.post<ApiResponse<Mission>>("/missions", missionData);
    return response.data;
  },

  update: async (id: string, missionData: Partial<Mission>): Promise<ApiResponse<Mission>> => {
    const response = await api.put<ApiResponse<Mission>>(`/missions/${id}`, missionData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/missions/${id}`);
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
    search?: string;
  }): Promise<ApiResponse<Intervention[]>> => {
    const response = await api.get<ApiResponse<Intervention[]>>("/interventions", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Intervention>> => {
    const response = await api.get<ApiResponse<Intervention>>(`/interventions/${id}`);
    return response.data;
  },

  create: async (interventionData: Partial<Intervention>): Promise<ApiResponse<Intervention>> => {
    const response = await api.post<ApiResponse<Intervention>>("/interventions", interventionData);
    return response.data;
  },

  update: async (id: number, interventionData: Partial<Intervention>): Promise<ApiResponse<Intervention>> => {
    const response = await api.put<ApiResponse<Intervention>>(`/interventions/${id}`, interventionData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/interventions/${id}`);
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
    const response = await api.get<ApiResponse<Technicien[]>>("/techniciens", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Technicien>> => {
    const response = await api.get<ApiResponse<Technicien>>(`/techniciens/${id}`);
    return response.data;
  },

  create: async (technicienData: Partial<Technicien>): Promise<ApiResponse<Technicien>> => {
    const response = await api.post<ApiResponse<Technicien>>("/techniciens", technicienData);
    return response.data;
  },

  update: async (id: number, technicienData: Partial<Technicien>): Promise<ApiResponse<Technicien>> => {
    const response = await api.put<ApiResponse<Technicien>>(`/techniciens/${id}`, technicienData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/techniciens/${id}`);
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
    const response = await api.get<ApiResponse<Materiel[]>>("/materiels", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Materiel>> => {
    const response = await api.get<ApiResponse<Materiel>>(`/materiels/${id}`);
    return response.data;
  },

  create: async (materielData: Partial<Materiel>): Promise<ApiResponse<Materiel>> => {
    const response = await api.post<ApiResponse<Materiel>>("/materiels", materielData);
    return response.data;
  },

  update: async (id: number, materielData: Partial<Materiel>): Promise<ApiResponse<Materiel>> => {
    const response = await api.put<ApiResponse<Materiel>>(`/materiels/${id}`, materielData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/materiels/${id}`);
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
    const response = await api.get<ApiResponse<RapportMission[]>>("/rapports", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<RapportMission>> => {
    const response = await api.get<ApiResponse<RapportMission>>(`/rapports/${id}`);
    return response.data;
  },

  create: async (rapportData: Partial<RapportMission>): Promise<ApiResponse<RapportMission>> => {
    const response = await api.post<ApiResponse<RapportMission>>("/rapports", rapportData);
    return response.data;
  },

  update: async (id: number, rapportData: Partial<RapportMission>): Promise<ApiResponse<RapportMission>> => {
    const response = await api.put<ApiResponse<RapportMission>>(`/rapports/${id}`, rapportData);
    return response.data;
  },

  validate: async (id: number, commentaire?: string): Promise<ApiResponse<RapportMission>> => {
    const response = await api.post<ApiResponse<RapportMission>>(`/rapports/${id}/validate`, { commentaire });
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/rapports/${id}`);
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
    const response = await api.get<ApiResponse<Supplier[]>>("/suppliers", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Supplier>> => {
    const response = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data;
  },

  create: async (supplierData: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    const response = await api.post<ApiResponse<Supplier>>("/suppliers", supplierData);
    return response.data;
  },

  update: async (id: number, supplierData: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    const response = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, supplierData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/suppliers/${id}`);
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
    const response = await api.get<ApiResponse<PurchaseOrder[]>>("/purchases", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.get<ApiResponse<PurchaseOrder>>(`/purchases/${id}`);
    return response.data;
  },

  create: async (purchaseData: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.post<ApiResponse<PurchaseOrder>>("/purchases", purchaseData);
    return response.data;
  },

  update: async (id: number, purchaseData: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> => {
    const response = await api.put<ApiResponse<PurchaseOrder>>(`/purchases/${id}`, purchaseData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/purchases/${id}`);
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
    const response = await api.get<ApiResponse<ClientProject[]>>("/projects", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<ClientProject>> => {
    const response = await api.get<ApiResponse<ClientProject>>(`/projects/${id}`);
    return response.data;
  },

  create: async (projectData: Partial<ClientProject>): Promise<ApiResponse<ClientProject>> => {
    const response = await api.post<ApiResponse<ClientProject>>("/projects", projectData);
    return response.data;
  },

  update: async (id: number, projectData: Partial<ClientProject>): Promise<ApiResponse<ClientProject>> => {
    const response = await api.put<ApiResponse<ClientProject>>(`/projects/${id}`, projectData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/projects/${id}`);
    return response.data;
  },
};

// ============================================================================
// SERVICES CALENDRIER ET CONGÉS
// ============================================================================

export const calendarService = {
  // Méthode principale pour CalendarManagement
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    userId?: number;
    includeTimeOffs?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>("/calendar", { params });
    return response.data;
  },

  getEvents: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    calendarId?: number;
  }): Promise<ApiResponse<CalendarEvent[]>> => {
    const response = await api.get<ApiResponse<CalendarEvent[]>>("/calendar/events", { params });
    return response.data;
  },

  createEvent: async (eventData: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> => {
    const response = await api.post<ApiResponse<CalendarEvent>>("/calendar/events", eventData);
    return response.data;
  },

  updateEvent: async (id: number, eventData: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> => {
    const response = await api.put<ApiResponse<CalendarEvent>>(`/calendar/events/${id}`, eventData);
    return response.data;
  },

  deleteEvent: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/calendar/events/${id}`);
    return response.data;
  },

  // Méthodes pour les time offs
  createTimeOff: async (timeOffData: Partial<TimeOffRequest>): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>("/time-off", timeOffData);
    return response.data;
  },

  getTimeOffs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>("/time-off", { params });
    return response.data;
  },

  updateTimeOffStatus: async (id: number, statusData: { status: string; comments?: string }): Promise<ApiResponse<any>> => {
    const response = await api.patch<ApiResponse<any>>(`/time-off/${id}/status`, statusData);
    return response.data;
  }
};

// ============================================================================
// SERVICES COMPTABILITÉ ET FINANCE
// ============================================================================

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
    const response = await api.get<ApiResponse<Expense[]>>("/expenses", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Expense>> => {
    const response = await api.get<ApiResponse<Expense>>(`/expenses/${id}`);
    return response.data;
  },

  create: async (expenseData: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    const response = await api.post<ApiResponse<Expense>>("/expenses", expenseData);
    return response.data;
  },

  update: async (id: number, expenseData: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    const response = await api.put<ApiResponse<Expense>>(`/expenses/${id}`, expenseData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/expenses/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<ApiResponse<string[]>> => {
    const response = await api.get<ApiResponse<string[]>>("/expenses/categories");
    return response.data;
  },
};

// ============================================================================
// SERVICES ADMINISTRATION
// ============================================================================

export const serviceService = {
  getAll: async (params?: { search?: string }): Promise<ApiResponse<Service[]>> => {
    const response = await api.get<ApiResponse<Service[]>>("/services", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Service>> => {
    const response = await api.get<ApiResponse<Service>>(`/services/${id}`);
    return response.data;
  },

  create: async (serviceData: Partial<Service>): Promise<ApiResponse<Service>> => {
    const response = await api.post<ApiResponse<Service>>("/services", serviceData);
    return response.data;
  },

  update: async (id: number, serviceData: Partial<Service>): Promise<ApiResponse<Service>> => {
    const response = await api.put<ApiResponse<Service>>(`/services/${id}`, serviceData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/services/${id}`);
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
    const response = await api.get<ApiResponse<Product[]>>("/products", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Product>> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  create: async (productData: Partial<Product>): Promise<ApiResponse<Product>> => {
    const response = await api.post<ApiResponse<Product>>("/products", productData);
    return response.data;
  },

  update: async (id: number, productData: Partial<Product>): Promise<ApiResponse<Product>> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, productData);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/products/${id}`);
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
    const response = await api.get<ApiResponse<Message[]>>("/messages", { params });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<Message>> => {
    const response = await api.get<ApiResponse<Message>>(`/messages/${id}`);
    return response.data;
  },

  create: async (messageData: Partial<Message>): Promise<ApiResponse<Message>> => {
    const response = await api.post<ApiResponse<Message>>("/messages", messageData);
    return response.data;
  },

  update: async (id: number, messageData: Partial<Message>): Promise<ApiResponse<Message>> => {
    const response = await api.put<ApiResponse<Message>>(`/messages/${id}`, messageData);
    return response.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<Message>> => {
    const response = await api.patch<ApiResponse<Message>>(`/messages/${id}/read`);
    return response.data;
  },
};

// ============================================================================
// UTILITAIRES ET GESTION D'ERREURS
// ============================================================================

// Service générique pour les opérations CRUD
export const createCrudService = <T>(endpoint: string) => ({
  getAll: async (params?: Record<string, unknown>): Promise<ApiResponse<T[]>> => {
    const response = await api.get<ApiResponse<T[]>>(`/${endpoint}`, { params });
    return response.data;
  },

  getById: async (id: number | string): Promise<ApiResponse<T>> => {
    const response = await api.get<ApiResponse<T>>(`/${endpoint}/${id}`);
    return response.data;
  },

  create: async (data: Partial<T>): Promise<ApiResponse<T>> => {
    const response = await api.post<ApiResponse<T>>(`/${endpoint}`, data);
    return response.data;
  },

  update: async (id: number | string, data: Partial<T>): Promise<ApiResponse<T>> => {
    const response = await api.put<ApiResponse<T>>(`/${endpoint}/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/${endpoint}/${id}`);
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

export default api;