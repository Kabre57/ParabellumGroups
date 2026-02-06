import apiClient from '../shared/client';

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number | null;
  serviceId: number | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  phone: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  employeeNumber: string | null;
  hireDate: string | null;
  emergencyContact: string | null;
  role?: Role;
  service?: Service;
  userPermissions?: UserPermission[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions?: RolePermission[];
}

export interface Service {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  parentId: number | null;
  managerId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Service;
  children?: Service[];
  manager?: AdminUser;
  _count?: { members: number };
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  createdAt: string;
  permission?: Permission;
}

export interface UserPermission {
  id: number;
  userId: number;
  permissionId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  createdAt: string;
  permission?: Permission;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: number;
  serviceId?: number;
  isActive?: boolean;
  phone?: string;
  position?: string;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: number | null;
  serviceId?: number | null;
  isActive?: boolean;
  phone?: string;
  position?: string;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateServiceRequest {
  name: string;
  code?: string;
  description?: string;
  parentId?: number;
  managerId?: number;
}

export interface UpdateServiceRequest {
  name?: string;
  code?: string;
  description?: string;
  parentId?: number | null;
  managerId?: number | null;
  isActive?: boolean;
}

export interface SetPermissionsRequest {
  permissionIds?: number[];
  permissions?: {
    permissionId: number;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
  }[];
}

export interface UserFilters {
  search?: string;
  roleId?: number;
  serviceId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiDetailResponse<T> {
  success: boolean;
  data: T;
}

export const adminUsersService = {
  getUsers: async (filters?: UserFilters): Promise<ApiListResponse<AdminUser>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.roleId) params.append('roleId', String(filters.roleId));
    if (filters?.serviceId) params.append('serviceId', String(filters.serviceId));
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    const query = params.toString();
    const response = await apiClient.get<ApiListResponse<AdminUser>>(`/auth/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  getUser: async (id: number): Promise<ApiDetailResponse<AdminUser>> => {
    const response = await apiClient.get<ApiDetailResponse<AdminUser>>(`/auth/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserRequest): Promise<ApiDetailResponse<AdminUser>> => {
    const response = await apiClient.post<ApiDetailResponse<AdminUser>>('/auth/users', data);
    return response.data;
  },

  updateUser: async (id: number, data: UpdateUserRequest): Promise<ApiDetailResponse<AdminUser>> => {
    const response = await apiClient.put<ApiDetailResponse<AdminUser>>(`/auth/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/auth/users/${id}`);
    return response.data;
  },

  activateUser: async (id: number): Promise<ApiDetailResponse<AdminUser>> => {
    const response = await apiClient.patch<ApiDetailResponse<AdminUser>>(`/auth/users/${id}/status`, { isActive: true });
    return response.data;
  },

  deactivateUser: async (id: number): Promise<ApiDetailResponse<AdminUser>> => {
    const response = await apiClient.patch<ApiDetailResponse<AdminUser>>(`/auth/users/${id}/status`, { isActive: false });
    return response.data;
  },

  getUserPermissions: async (id: number): Promise<ApiListResponse<UserPermission>> => {
    const response = await apiClient.get<ApiListResponse<UserPermission>>(`/auth/users/${id}/permissions`);
    return response.data;
  },

  setUserPermissions: async (id: number, data: SetPermissionsRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/auth/users/${id}/permissions`, data);
    return response.data;
  },

  revokeAllTokens: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/auth/users/${id}/revoke-tokens`, {});
    return response.data;
  },

  resetPassword: async (id: number, newPassword: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/auth/users/${id}/reset-password`, { password: newPassword });
    return response.data;
  },
};

export const adminRolesService = {
  getRoles: async (includeInactive = false): Promise<ApiListResponse<Role>> => {
    const params = includeInactive ? '?isActive=false' : '';
    const response = await apiClient.get<ApiListResponse<Role>>(`/auth/roles${params}`);
    return response.data;
  },

  getRole: async (id: number): Promise<ApiDetailResponse<Role>> => {
    const response = await apiClient.get<ApiDetailResponse<Role>>(`/auth/roles/${id}`);
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<ApiDetailResponse<Role>> => {
    const response = await apiClient.post<ApiDetailResponse<Role>>('/auth/roles', data);
    return response.data;
  },

  updateRole: async (id: number, data: UpdateRoleRequest): Promise<ApiDetailResponse<Role>> => {
    const response = await apiClient.put<ApiDetailResponse<Role>>(`/auth/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/auth/roles/${id}`);
    return response.data;
  },

  getRolePermissions: async (id: number): Promise<ApiListResponse<RolePermission>> => {
    const response = await apiClient.get<ApiListResponse<RolePermission>>(`/auth/permissions/roles/${id}`);
    return response.data;
  },

  setRolePermissions: async (id: number, data: SetPermissionsRequest): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>(`/auth/permissions/roles/${id}`, data);
    return response.data;
  },
};

export const adminServicesService = {
  getServices: async (includeInactive = false): Promise<ApiListResponse<Service>> => {
    const params = includeInactive ? '?isActive=false' : '';
    const response = await apiClient.get<ApiListResponse<Service>>(`/auth/services${params}`);
    return response.data;
  },

  getService: async (id: number): Promise<ApiDetailResponse<Service>> => {
    const response = await apiClient.get<ApiDetailResponse<Service>>(`/auth/services/${id}`);
    return response.data;
  },

  createService: async (data: CreateServiceRequest): Promise<ApiDetailResponse<Service>> => {
    const response = await apiClient.post<ApiDetailResponse<Service>>('/auth/services', data);
    return response.data;
  },

  updateService: async (id: number, data: UpdateServiceRequest): Promise<ApiDetailResponse<Service>> => {
    const response = await apiClient.put<ApiDetailResponse<Service>>(`/auth/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/auth/services/${id}`);
    return response.data;
  },

  getServiceMembers: async (id: number): Promise<ApiListResponse<AdminUser>> => {
    const response = await apiClient.get<ApiListResponse<AdminUser>>(`/auth/services/${id}/members`);
    return response.data;
  },

  getServiceHierarchy: async (): Promise<ApiListResponse<Service>> => {
    const response = await apiClient.get<ApiListResponse<Service>>('/auth/services/hierarchy');
    return response.data;
  },
};

export const adminPermissionsService = {
  getPermissions: async (category?: string): Promise<ApiListResponse<Permission>> => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await apiClient.get<ApiListResponse<Permission>>(`/auth/permissions${params}`);
    return response.data;
  },

  getPermission: async (id: number): Promise<ApiDetailResponse<Permission>> => {
    const response = await apiClient.get<ApiDetailResponse<Permission>>(`/auth/permissions/${id}`);
    return response.data;
  },

  createPermission: async (data: { name: string; description?: string; category: string }): Promise<ApiDetailResponse<Permission>> => {
    const response = await apiClient.post<ApiDetailResponse<Permission>>('/auth/permissions', data);
    return response.data;
  },

  updatePermission: async (id: number, data: { name?: string; description?: string; category?: string }): Promise<ApiDetailResponse<Permission>> => {
    const response = await apiClient.put<ApiDetailResponse<Permission>>(`/auth/permissions/${id}`, data);
    return response.data;
  },

  deletePermission: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/auth/permissions/${id}`);
    return response.data;
  },

  getPermissionCategories: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await apiClient.get<{ success: boolean; data: string[] }>('/auth/permissions/categories');
    return response.data;
  },
};

export const adminService = {
  users: adminUsersService,
  roles: adminRolesService,
  services: adminServicesService,
  permissions: adminPermissionsService,
};

export default adminService;
