import { apiClient } from '../client';
import type { ListResponse, DetailResponse } from '../shared/types';

// ============ INTERFACES ADMIN ============

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
  city: string | null;
  country: string | null;
  postalCode: string | null;
  birthDate: string | null;
  hireDate: string | null;
  position: string | null;
  employeeId: string | null;
  baseSalary: number | null;
  currency: string | null;
  contractType: string | null;
  workSchedule: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
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
  code: string;
  description: string | null;
  parentId: number | null;
  managerId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Service;
  children?: Service[];
  manager?: AdminUser;
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

// ============ REQUEST INTERFACES ============

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: number;
  serviceId?: number;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  birthDate?: string;
  hireDate?: string;
  position?: string;
  employeeId?: string;
  baseSalary?: number;
  currency?: string;
  contractType?: string;
  workSchedule?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: number | null;
  serviceId?: number | null;
  isActive?: boolean;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  birthDate?: string;
  hireDate?: string;
  position?: string;
  employeeId?: string;
  baseSalary?: number;
  currency?: string;
  contractType?: string;
  workSchedule?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateServiceRequest {
  name: string;
  code: string;
  description?: string;
  parentId?: number;
  managerId?: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  parentId?: number | null;
  managerId?: number | null;
  isActive?: boolean;
}

export interface SetPermissionsRequest {
  permissions: {
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

// ============ ADMIN USERS SERVICE ============

export const adminUsersService = {
  getUsers: async (filters?: UserFilters): Promise<ListResponse<AdminUser>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.roleId) params.append('roleId', String(filters.roleId));
    if (filters?.serviceId) params.append('serviceId', String(filters.serviceId));
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    const query = params.toString();
    return apiClient.get<ListResponse<AdminUser>>(`/auth/admin/users${query ? `?${query}` : ''}`);
  },

  getUser: async (id: number): Promise<DetailResponse<AdminUser>> => {
    return apiClient.get<DetailResponse<AdminUser>>(`/auth/admin/users/${id}`);
  },

  createUser: async (data: CreateUserRequest): Promise<DetailResponse<AdminUser>> => {
    return apiClient.post<DetailResponse<AdminUser>>('/auth/admin/users', data);
  },

  updateUser: async (id: number, data: UpdateUserRequest): Promise<DetailResponse<AdminUser>> => {
    return apiClient.put<DetailResponse<AdminUser>>(`/auth/admin/users/${id}`, data);
  },

  deleteUser: async (id: number): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/auth/admin/users/${id}`);
  },

  activateUser: async (id: number): Promise<DetailResponse<AdminUser>> => {
    return apiClient.patch<DetailResponse<AdminUser>>(`/auth/admin/users/${id}/activate`, {});
  },

  deactivateUser: async (id: number): Promise<DetailResponse<AdminUser>> => {
    return apiClient.patch<DetailResponse<AdminUser>>(`/auth/admin/users/${id}/deactivate`, {});
  },

  getUserPermissions: async (id: number): Promise<ListResponse<UserPermission>> => {
    return apiClient.get<ListResponse<UserPermission>>(`/auth/admin/users/${id}/permissions`);
  },

  setUserPermissions: async (id: number, data: SetPermissionsRequest): Promise<{ success: boolean }> => {
    return apiClient.put<{ success: boolean }>(`/auth/admin/users/${id}/permissions`, data);
  },

  revokeAllTokens: async (id: number): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/auth/admin/users/${id}/revoke-tokens`, {});
  },

  resetPassword: async (id: number, newPassword: string): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/auth/admin/users/${id}/reset-password`, { newPassword });
  },
};

// ============ ADMIN ROLES SERVICE ============

export const adminRolesService = {
  getRoles: async (includeInactive = false): Promise<ListResponse<Role>> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    return apiClient.get<ListResponse<Role>>(`/auth/admin/roles${params}`);
  },

  getRole: async (id: number): Promise<DetailResponse<Role>> => {
    return apiClient.get<DetailResponse<Role>>(`/auth/admin/roles/${id}`);
  },

  createRole: async (data: CreateRoleRequest): Promise<DetailResponse<Role>> => {
    return apiClient.post<DetailResponse<Role>>('/auth/admin/roles', data);
  },

  updateRole: async (id: number, data: UpdateRoleRequest): Promise<DetailResponse<Role>> => {
    return apiClient.put<DetailResponse<Role>>(`/auth/admin/roles/${id}`, data);
  },

  deleteRole: async (id: number): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/auth/admin/roles/${id}`);
  },

  getRolePermissions: async (id: number): Promise<ListResponse<RolePermission>> => {
    return apiClient.get<ListResponse<RolePermission>>(`/auth/admin/roles/${id}/permissions`);
  },

  setRolePermissions: async (id: number, data: SetPermissionsRequest): Promise<{ success: boolean }> => {
    return apiClient.put<{ success: boolean }>(`/auth/admin/roles/${id}/permissions`, data);
  },
};

// ============ ADMIN SERVICES SERVICE ============

export const adminServicesService = {
  getServices: async (includeInactive = false): Promise<ListResponse<Service>> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    return apiClient.get<ListResponse<Service>>(`/auth/admin/services${params}`);
  },

  getService: async (id: number): Promise<DetailResponse<Service>> => {
    return apiClient.get<DetailResponse<Service>>(`/auth/admin/services/${id}`);
  },

  createService: async (data: CreateServiceRequest): Promise<DetailResponse<Service>> => {
    return apiClient.post<DetailResponse<Service>>('/auth/admin/services', data);
  },

  updateService: async (id: number, data: UpdateServiceRequest): Promise<DetailResponse<Service>> => {
    return apiClient.put<DetailResponse<Service>>(`/auth/admin/services/${id}`, data);
  },

  deleteService: async (id: number): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`/auth/admin/services/${id}`);
  },

  getServiceMembers: async (id: number): Promise<ListResponse<AdminUser>> => {
    return apiClient.get<ListResponse<AdminUser>>(`/auth/admin/services/${id}/members`);
  },

  getServiceHierarchy: async (): Promise<ListResponse<Service>> => {
    return apiClient.get<ListResponse<Service>>('/auth/admin/services/hierarchy');
  },
};

// ============ ADMIN PERMISSIONS SERVICE ============

export const adminPermissionsService = {
  getPermissions: async (category?: string): Promise<ListResponse<Permission>> => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiClient.get<ListResponse<Permission>>(`/auth/admin/permissions${params}`);
  },

  getPermission: async (id: number): Promise<DetailResponse<Permission>> => {
    return apiClient.get<DetailResponse<Permission>>(`/auth/admin/permissions/${id}`);
  },

  getPermissionCategories: async (): Promise<{ success: boolean; data: string[] }> => {
    return apiClient.get<{ success: boolean; data: string[] }>('/auth/admin/permissions/categories');
  },
};

// ============ UNIFIED EXPORT ============

export const adminService = {
  users: adminUsersService,
  roles: adminRolesService,
  services: adminServicesService,
  permissions: adminPermissionsService,
};

export default adminService;
