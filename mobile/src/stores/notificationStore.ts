import { create } from 'zustand';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  link?: string;
  enterpriseId?: number;
  isRead: boolean;
};

type NotificationState = {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: (notifications: AppNotification[], unreadCount?: number) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({
    notifications,
    unreadCount: unreadCount ?? notifications.filter((notification) => !notification.isRead).length,
  }),
  addNotification: (notification) => set((state) => {
    const existingIndex = state.notifications.findIndex(({ id }) => id === notification.id);
    const notifications = [...state.notifications];
    if (existingIndex >= 0) {
      const existing = notifications[existingIndex];
      notifications[existingIndex] = { ...notification, isRead: existing?.isRead ?? notification.isRead };
    } else {
      notifications.unshift(notification);
    }
    return { notifications, unreadCount: notifications.filter(({ isRead }) => !isRead).length };
  }),
  markAsRead: (id) => set((state) => {
    const notifications = state.notifications.map((notification) =>
      notification.id === id ? { ...notification, isRead: true } : notification,
    );
    return { notifications, unreadCount: notifications.filter(({ isRead }) => !isRead).length };
  }),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
    unreadCount: 0,
  })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
