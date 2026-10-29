import { apiClient } from './client';
import type { AppNotification } from '../stores/notificationStore';

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  enterpriseId?: number;
};

type ListResponse = { success: true; data: NotificationRecord[]; unreadCount: number };

export const notificationApi = {
  async list(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const response = await apiClient.get<ListResponse>('/notifications');
    return {
      notifications: response.data.data.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        ...(notification.link ? { link: notification.link } : {}),
        ...(notification.enterpriseId ? { enterpriseId: notification.enterpriseId } : {}),
        isRead: notification.read,
      })),
      unreadCount: response.data.unreadCount,
    };
  },
  markAsRead(id: string): Promise<void> {
    return apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`).then(() => undefined);
  },
  markAllAsRead(): Promise<void> {
    return apiClient.patch('/notifications/mark-all-read').then(() => undefined);
  },
};
