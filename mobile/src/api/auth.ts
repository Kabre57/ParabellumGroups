import * as SecureStore from 'expo-secure-store';

import { apiClient } from './client';
import type { User } from '../stores/authStore';
import type { Enterprise } from '../stores/enterpriseStore';

type ApiResponse<T> = { success: boolean; data: T; message?: string };
type RawUser = {
  id: number | string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | { code?: string; name?: string } | null;
  roleCode?: string | null;
  enterpriseId?: number | string | null;
  enterpriseName?: string | null;
  enterprise?: { id?: number; name?: string } | null;
  permissions?: unknown;
  permissionsList?: unknown;
  mustChangePassword?: boolean;
};
type SessionPayload = {
  user: RawUser;
  accessToken: string;
  refreshToken?: string;
};

const normalizeUser = (raw: RawUser): User => {
  const role = typeof raw.role === 'string'
    ? raw.role
    : raw.role?.code || raw.role?.name || raw.roleCode || '';
  const enterpriseId = raw.enterpriseId ?? raw.enterprise?.id ?? null;
  const permissionValues = Array.isArray(raw.permissionsList)
    ? raw.permissionsList
    : Array.isArray(raw.permissions)
      ? raw.permissions
      : [];

  return {
    id: String(raw.id),
    email: raw.email,
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    role,
    enterpriseId: enterpriseId === null ? null : Number(enterpriseId),
    enterpriseName: raw.enterpriseName || raw.enterprise?.name || null,
    permissions: permissionValues.map(String),
    mustChangePassword: Boolean(raw.mustChangePassword),
  };
};

const saveSession = async (session: SessionPayload) => {
  await SecureStore.setItemAsync('access_token', session.accessToken);
  if (session.refreshToken) await SecureStore.setItemAsync('refresh_token', session.refreshToken);
  return normalizeUser(session.user);
};

export const authService = {
  async login(email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken?: string;
    enterprises: Enterprise[];
  }> {
    const response = await apiClient.post<ApiResponse<SessionPayload>>('/auth/login', {
      email: email.trim(),
      password,
    });
    const session = response.data.data;
    const user = await saveSession(session);
    try {
      const enterprises = user.mustChangePassword ? [] : await this.enterprises();
      return { ...session, user, enterprises };
    } catch (error) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      throw error;
    }
  },

  async me(): Promise<User> {
    const response = await apiClient.get<ApiResponse<RawUser>>('/auth/me');
    return normalizeUser(response.data.data);
  },

  async enterprises(): Promise<Enterprise[]> {
    const response = await apiClient.get<ApiResponse<Enterprise[]>>('/auth/enterprises', {
      params: { isActive: true },
    });
    return Array.isArray(response.data.data)
      ? response.data.data.filter((enterprise) => enterprise && Number.isInteger(Number(enterprise.id)))
      : [];
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken?: string;
  }> {
    const response = await apiClient.post<ApiResponse<SessionPayload>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    const session = response.data.data;
    const user = await saveSession(session);
    return { ...session, user };
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email: email.trim() });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },

  async logout(): Promise<void> {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  },
};
