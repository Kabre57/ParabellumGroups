import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router, Slot, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type JSX } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { notificationApi } from '@/api/notifications';
import { NotificationLinkingError, parseNotificationRequestTarget, resolveNotificationRequestTarget } from '@/services/notificationLinking';
import { registerForPushNotificationsAsync } from '@/services/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToastStore } from '@/stores/toastStore';
import { Toast } from '@/components/Toast';
import { theme } from '@/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout(): JSX.Element {
  const navigationState = useRootNavigationState();
  const handledResponses = useRef(new Set<string>());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    let active = true;
    const waitForSessionAndNavigation = async (): Promise<boolean> => {
      for (let attempt = 0; attempt < 240 && active; attempt += 1) {
        if (useAuthStore.getState().user && navigationState?.key) return true;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return false;
    };

    const openResponse = async (response: Notifications.NotificationResponse): Promise<void> => {
      const key = response.notification.request.identifier;
      if (handledResponses.current.has(key)) return;
      handledResponses.current.add(key);
      const target = parseNotificationRequestTarget(response.notification.request.content.data);
      if (!target) return;
      try {
        if (!(await waitForSessionAndNavigation()) || !active) return;
        const user = useAuthStore.getState().user;
        if (!user || user.mustChangePassword) return;
        const { enterprise, request } = await resolveNotificationRequestTarget(target, user.id);
        if (!active) return;
        useEnterpriseStore.getState().setActive(enterprise);
        router.push(`/demandes/${encodeURIComponent(request.id)}`);
      } catch (error: unknown) {
        if (!active) return;
        const message = error instanceof NotificationLinkingError
          ? error.message
          : 'Impossible d’ouvrir cette demande depuis la notification.';
        useToastStore.getState().show(message, 'error');
      }
    };

    const received = Notifications.addNotificationReceivedListener((notification) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      const title = notification.request.content.title?.trim();
      const body = notification.request.content.body?.trim();
      const data = notification.request.content.data as Record<string, unknown>;
      const enterpriseId = typeof data.enterpriseId === 'number' ? data.enterpriseId : undefined;
      useNotificationStore.getState().addNotification({
        id: notification.request.identifier,
        title: title || 'Nouvelle demande',
        message: body || '',
        createdAt: new Date().toISOString(),
        ...(typeof data.link === 'string' ? { link: data.link } : {}),
        ...(enterpriseId !== undefined ? { enterpriseId } : {}),
        isRead: false,
      });
      useToastStore.getState().show(title || body || 'Nouvelle demande', 'info');
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      void openResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void openResponse(response);
    }).catch(() => undefined);

    return () => {
      active = false;
      received.remove();
      responded.remove();
    };
  }, [navigationState?.key]);

  useEffect(() => {
    let registeredUserId: string | null = null;
    const register = (user: { id: string; mustChangePassword: boolean } | null): void => {
      if (!user || user.mustChangePassword || user.id === registeredUserId) return;
      const userId = user.id;
      registeredUserId = userId;
      void registerForPushNotificationsAsync().catch(() => {
        // Les permissions et services push ne doivent pas bloquer l'accès à l'application.
      });
    };
    register(useAuthStore.getState().user);
    return useAuthStore.subscribe((state) => register(state.user));
  }, []);

  useEffect(() => {
    let currentUserId: string | null = null;
    const syncNotifications = (user: { id: string; mustChangePassword: boolean } | null): void => {
      const userId = user?.mustChangePassword ? null : user?.id ?? null;
      if (userId === currentUserId) return;
      currentUserId = userId;
      if (!userId) {
        useNotificationStore.getState().clear();
        return;
      }
      void notificationApi.list().then(({ notifications, unreadCount }) => {
        if (useAuthStore.getState().user?.id === userId) {
          useNotificationStore.getState().setNotifications(notifications, unreadCount);
        }
      }).catch(() => undefined);
    };
    syncNotifications(useAuthStore.getState().user);
    return useAuthStore.subscribe((state) => syncNotifications(state.user));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Slot />
            <Toast />
          </SafeAreaProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
