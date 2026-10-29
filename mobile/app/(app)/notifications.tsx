import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useEffect, useState, type JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationApi } from '@/api/notifications';
import { NotificationLinkingError, parseNotificationRequestTarget, resolveNotificationRequestTarget } from '@/services/notificationLinking';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore';
import { useToastStore } from '@/stores/toastStore';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const getLoadError = (error: unknown): string => {
  if (isAxiosError(error) && error.response?.status === 403) {
    return 'Vous ne disposez pas de l’autorisation nécessaire pour consulter les notifications.';
  }
  return 'Impossible de charger les notifications. Vérifiez votre connexion puis réessayez.';
};

export default function NotificationsScreen(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void notificationApi.list().then(({ notifications: loaded, unreadCount: unread }) => {
      if (active) useNotificationStore.getState().setNotifications(loaded, unread);
    }).catch((failure: unknown) => {
      if (active) setError(getLoadError(failure));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const markAllAsRead = async (): Promise<void> => {
    useNotificationStore.getState().markAllAsRead();
    try {
      await notificationApi.markAllAsRead();
    } catch {
      useToastStore.getState().show('Les notifications ont été marquées comme lues sur cet appareil.', 'info');
    }
  };

  const openNotification = async (notification: AppNotification): Promise<void> => {
    useNotificationStore.getState().markAsRead(notification.id);
    void notificationApi.markAsRead(notification.id).catch(() => undefined);
    const target = parseNotificationRequestTarget({
      link: notification.link,
      ...(notification.enterpriseId !== undefined ? { enterpriseId: notification.enterpriseId } : {}),
    });
    if (!target || !user) {
      useToastStore.getState().show('Cette notification ne contient pas de lien valide vers une demande.', 'error');
      return;
    }
    try {
      const { enterprise, request } = await resolveNotificationRequestTarget(target, user.id);
      useEnterpriseStore.getState().setActive(enterprise);
      router.push(`/demandes/${encodeURIComponent(request.id)}`);
    } catch (failure: unknown) {
      const message = failure instanceof NotificationLinkingError
        ? failure.message
        : 'Impossible d’ouvrir cette demande depuis la notification.';
      useToastStore.getState().show(message, 'error');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text variant="titleLarge" style={{ color: colors.onSurface }}>Notifications</Text>
          {unreadCount > 0 ? (
            <Button mode="text" onPress={() => void markAllAsRead()}>Tout marquer comme lu</Button>
          ) : null}
        </View>
        {loading ? <ActivityIndicator accessibilityLabel="Chargement des notifications" /> : null}
        {error ? (
          <HelperText type="error" accessibilityRole="alert">{error}</HelperText>
        ) : null}
        {!loading && !error && notifications.length === 0 ? (
          <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Card.Content>
              <Text style={{ color: colors.onSurfaceVariant }}>Aucune notification pour le moment.</Text>
            </Card.Content>
          </Card>
        ) : null}
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            mode="outlined"
            onPress={() => void openNotification(notification)}
            style={[styles.card, {
              backgroundColor: notification.isRead ? colors.surface : colors.secondaryContainer,
              borderColor: colors.outline,
            }]}
            accessibilityRole="button"
            accessibilityLabel={`${notification.title}. ${notification.isRead ? 'Lue' : 'Non lue'}`}
          >
            <Card.Content style={styles.notificationContent}>
              <Text variant="titleMedium" style={{ color: colors.onSurface }}>{notification.title}</Text>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{notification.message}</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{formatDate(notification.createdAt)}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  card: { borderRadius: 12 },
  notificationContent: { gap: 6 },
});
