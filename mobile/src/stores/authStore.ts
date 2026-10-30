import { create } from 'zustand';

import { useEnterpriseStore } from './enterpriseStore';
import { useNotificationStore } from './notificationStore';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  enterpriseId: number | null;
  enterpriseName: string | null;
  permissions: string[];
  mustChangePassword: boolean;
};

export type NotificationRegistrationStatus =
  | 'idle' | 'registering' | 'registered' | 'local-only'
  | 'denied' | 'unavailable' | 'error' | 'missing-project';

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  expoPushToken: string | null;
  notificationRegistrationStatus: NotificationRegistrationStatus;
  setPushRegistration: (token: string | null, status: NotificationRegistrationStatus) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const adminRoles = new Set(['ADMIN', 'ADMINISTRATOR', 'ADMINISTRATEUR', 'SUPER_ADMIN', 'SUPERADMIN']);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAdmin: false,
  expoPushToken: null,
  notificationRegistrationStatus: 'idle',
  setPushRegistration: (expoPushToken, notificationRegistrationStatus) =>
    set({ expoPushToken, notificationRegistrationStatus }),
  setUser: (user) => {
    if (get().user?.id !== user?.id) useNotificationStore.getState().clear();
    set({
      user,
      isAdmin: user !== null && adminRoles.has(user.role),
      ...(get().user?.id !== user?.id ? { expoPushToken: null, notificationRegistrationStatus: 'idle' as const } : {}),
    });
  },
  logout: () => {
    set({ user: null, isAdmin: false, expoPushToken: null, notificationRegistrationStatus: 'idle' });
    useEnterpriseStore.getState().clear();
    useNotificationStore.getState().clear();
  },
}));
