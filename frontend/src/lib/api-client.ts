/**
 * API Client pour les appels backend
 * Centralise la configuration et les appels API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    
    // Récupérer le token du localStorage au chargement
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur de connexion au serveur');
    }
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: any;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data.accessToken) {
      this.setToken(response.data.accessToken);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  // Users
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    serviceId?: number;
    isActive?: boolean;
    search?: string;
  }) {
    const queryString = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    
    return this.request<any>(`/users${queryString}`);
  }

  async getUserById(id: number) {
    return this.request<any>(`/users/${id}`);
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    serviceId?: number;
    isActive?: boolean;
  }) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: number, data: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    serviceId?: number;
    isActive?: boolean;
  }) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: number) {
    return this.request<any>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async updateUserStatus(id: number, isActive: boolean) {
    return this.request<any>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async getUserPermissions(userId: number) {
    return this.request<any>(`/users/${userId}/permissions`);
  }

  async updateUserPermissions(userId: number, permissions: string[]) {
    return this.request<any>(`/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  // Services
  async getServices() {
    return this.request<any>('/services');
  }

  async getServiceById(id: number) {
    return this.request<any>(`/services/${id}`);
  }

  async createService(data: {
    name: string;
    code?: string;
    description?: string;
    parentId?: number;
    managerId?: number;
    isActive?: boolean;
  }) {
    return this.request<any>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: number, data: {
    name?: string;
    code?: string;
    description?: string;
    parentId?: number;
    managerId?: number;
    isActive?: boolean;
  }) {
    return this.request<any>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: number) {
    return this.request<any>(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Permissions
  async getPermissions(category?: string) {
    const queryString = category ? `?category=${category}` : '';
    return this.request<any>(`/permissions${queryString}`);
  }

  async getPermissionById(id: number) {
    return this.request<any>(`/permissions/${id}`);
  }

  async createPermission(data: {
    name: string;
    description?: string;
    category: string;
  }) {
    return this.request<any>('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePermission(id: number, data: {
    name?: string;
    description?: string;
    category?: string;
  }) {
    return this.request<any>(`/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePermission(id: number) {
    return this.request<any>(`/permissions/${id}`, {
      method: 'DELETE',
    });
  }

  async getRolePermissions(role: string) {
    return this.request<any>(`/permissions/roles/${role}`);
  }

  async updateRolePermission(
    role: string,
    permissionId: number,
    data: {
      canView?: boolean;
      canCreate?: boolean;
      canEdit?: boolean;
      canDelete?: boolean;
      canApprove?: boolean;
    }
  ) {
    return this.request<any>(`/permissions/roles/${role}/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRolePermission(role: string, permissionId: number) {
    return this.request<any>(`/permissions/roles/${role}/${permissionId}`, {
      method: 'DELETE',
    });
  }

  // Roles
  async getRoles(isActive?: boolean) {
    const queryString = isActive !== undefined ? `?isActive=${isActive}` : '';
    return this.request<any>(`/roles${queryString}`);
  }

  async getRoleById(id: number) {
    return this.request<any>(`/roles/${id}`);
  }

  async createRole(data: {
    name: string;
    code: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.request<any>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(id: number, data: {
    name?: string;
    code?: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.request<any>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(id: number) {
    return this.request<any>(`/roles/${id}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
