import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/shared/client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data;
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });
}

export function useMarkNotificationAsRead() {
  return async (notificationId: string) => {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  };
}

export function useMarkAllNotificationsAsRead() {
  return async () => {
    await apiClient.patch('/notifications/mark-all-read');
  };
}
