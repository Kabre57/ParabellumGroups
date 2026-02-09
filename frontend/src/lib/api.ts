import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from '@/shared/api/shared/client';

// On réutilise l'instance du nouveau client pour assurer la cohérence
export const api = apiClient.getAxiosInstance();

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  nom?: string;
  name?: string;
  code?: string;
  description?: string;
  actif?: boolean;
  isActive?: boolean;
  isSystem?: boolean;
  permissions?: Permission[];
  rolePermissions?: { permission: Permission }[];
  _count?: { users: number; rolePermissions: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  nom: string;
  description?: string;
  service: string;
  action: string;
}

export interface Service {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Les méthodes ci-dessous sont conservées pour la compatibilité avec l'ancien code
// mais elles utilisent désormais l'instance centralisée apiClient
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  register: async (userData: {
    nom: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; data: User }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  me: async (): Promise<{ success: boolean; data: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

export const userApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    actif?: boolean;
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>('/auth/users', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: User }> => {
    const response = await api.get(`/auth/users/${id}`);
    return response.data;
  },

  create: async (userData: {
    nom: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; data: User }> => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },

  update: async (
    id: string,
    userData: Partial<{ nom: string; email: string; password: string }>
  ): Promise<{ success: boolean; data: User }> => {
    const response = await api.put(`/auth/users/${id}`, userData);
    return response.data;
  },

  updateStatus: async (
    id: string,
    actif: boolean
  ): Promise<{ success: boolean; data: User }> => {
    const response = await api.patch(`/auth/users/${id}/status`, { actif });
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },

  assignRole: async (
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/auth/users/${userId}/roles`, { roleId });
    return response.data;
  },

  removeRole: async (
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/users/${userId}/roles/${roleId}`);
    return response.data;
  },
};

export const roleApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    actif?: boolean;
  }): Promise<PaginatedResponse<Role>> => {
    const response = await api.get<PaginatedResponse<Role>>('/auth/roles', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: Role }> => {
    const response = await api.get(`/auth/roles/${id}`);
    return response.data;
  },

  create: async (roleData: {
    nom: string;
    description?: string;
  }): Promise<{ success: boolean; data: Role }> => {
    const response = await api.post('/auth/roles', roleData);
    return response.data;
  },

  update: async (
    id: string,
    roleData: Partial<{ nom: string; description: string }>
  ): Promise<{ success: boolean; data: Role }> => {
    const response = await api.put(`/auth/roles/${id}`, roleData);
    return response.data;
  },

  updateStatus: async (
    id: string,
    actif: boolean
  ): Promise<{ success: boolean; data: Role }> => {
    const response = await api.patch(`/auth/roles/${id}/status`, { actif });
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/roles/${id}`);
    return response.data;
  },

  assignPermission: async (
    roleId: string,
    permissionId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/auth/roles/${roleId}/permissions`, { permissionId });
    return response.data;
  },

  removePermission: async (
    roleId: string,
    permissionId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/roles/${roleId}/permissions/${permissionId}`);
    return response.data;
  },
};

export const permissionApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    service?: string;
  }): Promise<PaginatedResponse<Permission>> => {
    const response = await api.get<PaginatedResponse<Permission>>('/auth/permissions', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: Permission }> => {
    const response = await api.get(`/auth/permissions/${id}`);
    return response.data;
  },

  create: async (permissionData: {
    nom: string;
    description?: string;
    service: string;
    action: string;
  }): Promise<{ success: boolean; data: Permission }> => {
    const response = await api.post('/auth/permissions', permissionData);
    return response.data;
  },

  update: async (
    id: string,
    permissionData: Partial<{
      nom: string;
      description: string;
      service: string;
      action: string;
    }>
  ): Promise<{ success: boolean; data: Permission }> => {
    const response = await api.put(`/auth/permissions/${id}`, permissionData);
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/permissions/${id}`);
    return response.data;
  },
};

export const serviceApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    actif?: boolean;
  }): Promise<PaginatedResponse<Service>> => {
    const response = await api.get<PaginatedResponse<Service>>('/auth/services', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: Service }> => {
    const response = await api.get(`/auth/services/${id}`);
    return response.data;
  },

  create: async (serviceData: {
    nom: string;
    description?: string;
  }): Promise<{ success: boolean; data: Service }> => {
    const response = await api.post('/auth/services', serviceData);
    return response.data;
  },

  update: async (
    id: string,
    serviceData: Partial<{ nom: string; description: string }>
  ): Promise<{ success: boolean; data: Service }> => {
    const response = await api.put(`/auth/services/${id}`, serviceData);
    return response.data;
  },

  updateStatus: async (
    id: string,
    actif: boolean
  ): Promise<{ success: boolean; data: Service }> => {
    const response = await api.patch(`/auth/services/${id}/status`, { actif });
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/auth/services/${id}`);
    return response.data;
  },
};

export default api;
