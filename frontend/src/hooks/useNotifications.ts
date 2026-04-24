import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/shared/client';
import { useAuth } from '@/hooks/useAuth';
import { hasAnyPermission, isAdminRole } from '@/shared/permissions';
import communicationService from '@/shared/api/communication';
import { useNotificationStream } from './useNotificationStream';

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
  const { user, isAuthenticated } = useAuth();
  const canReadSystemNotifications =
    isAdminRole(user) || hasAnyPermission(user, ['notifications.read', 'notifications.read_own']);
  const canReadMessages = isAdminRole(user) || hasAnyPermission(user, ['messages.read']);
  const canReadNotifications = canReadSystemNotifications || canReadMessages;
  const currentUserId = user?.id != null ? String(user.id) : '';
  const currentUserEmail = user?.email ? String(user.email).trim().toLowerCase() : '';
  useNotificationStream(canReadSystemNotifications);

  return useQuery<NotificationsResponse>({
    queryKey: [
      'notifications',
      currentUserId,
      currentUserEmail,
      canReadSystemNotifications,
      canReadMessages,
    ],
    queryFn: async () => {
      const [notificationResponse, inboxById, inboxByEmail] = await Promise.all([
        canReadSystemNotifications
          ? apiClient.get('/notifications')
          : Promise.resolve({ data: { data: [], unreadCount: 0 } }),
        canReadMessages && currentUserId
          ? communicationService.getMessages({ destinataireId: currentUserId })
          : Promise.resolve([]),
        canReadMessages && currentUserEmail && currentUserEmail !== currentUserId.toLowerCase()
          ? communicationService.getMessages({ destinataireId: currentUserEmail })
          : Promise.resolve([]),
      ]);

      const systemNotifications = notificationResponse.data?.data || [];
      const unreadCount = Number(notificationResponse.data?.unreadCount || 0);

      const unreadMessages = [...inboxById, ...inboxByEmail]
        .filter((message) => message.status !== 'LU' && message.status !== 'ARCHIVE')
        .map((message) => ({
          id: `message:${message.id}`,
          title: message.sujet || 'Nouveau message',
          message: message.contenu,
          type: 'info' as const,
          read: false,
          createdAt: message.dateEnvoi || message.createdAt || new Date().toISOString(),
          link: '/dashboard/messages',
        }));

      const merged = new Map<string, Notification>();
      [...systemNotifications, ...unreadMessages].forEach((entry) => {
        merged.set(entry.id, entry);
      });

      return {
        success: true,
        data: Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        unreadCount: unreadCount + unreadMessages.length,
      };
    },
    enabled: isAuthenticated && canReadNotifications,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useMarkNotificationAsRead() {
  return async (notificationId: string) => {
    if (notificationId.startsWith('message:')) {
      const messageId = notificationId.replace(/^message:/, '');
      await communicationService.markMessageAsRead(messageId);
      return;
    }
    await apiClient.patch(`/notifications/${notificationId}/read`);
  };
}

export function useMarkAllNotificationsAsRead() {
  const { user } = useAuth();
  const canReadSystemNotifications =
    isAdminRole(user) || hasAnyPermission(user, ['notifications.read', 'notifications.read_own']);
  const canReadMessages = isAdminRole(user) || hasAnyPermission(user, ['messages.read']);
  const currentUserId = user?.id != null ? String(user.id) : '';
  const currentUserEmail = user?.email ? String(user.email).trim().toLowerCase() : '';

  return async () => {
    if (canReadSystemNotifications) {
      await apiClient.patch('/notifications/mark-all-read');
    }

    const requests = [];
    if (canReadMessages && currentUserId) {
      requests.push(communicationService.getMessages({ destinataireId: currentUserId }));
    }
    if (canReadMessages && currentUserEmail && currentUserEmail !== currentUserId.toLowerCase()) {
      requests.push(communicationService.getMessages({ destinataireId: currentUserEmail }));
    }

    const messageGroups = await Promise.all(requests);
    const unreadMessages = messageGroups
      .flat()
      .filter((message) => message.status !== 'LU' && message.status !== 'ARCHIVE');

    await Promise.all(
      unreadMessages.map((message) => communicationService.markMessageAsRead(message.id))
    );
  };
}
