import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export const OPERATIONAL_REQUESTS_CHANNEL_ID = 'operational-requests';

/** Request permission and obtain an Expo token when running on a real build/device. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const setStatus = useAuthStore.getState().setPushRegistration;
  setStatus(null, 'registering');

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(OPERATIONAL_REQUESTS_CHANNEL_ID, {
        name: 'Demandes opérationnelles',
        description: 'Nouvelles demandes et mises à jour de leur traitement',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    if (Constants.appOwnership === 'expo') {
      setStatus(null, 'local-only');
      return null;
    }

    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted
      ? current
      : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    if (!permission.granted) {
      setStatus(null, 'denied');
      return null;
    }

    // Expo Go can schedule local notifications, but Android remote push requires a development build.
    if (!Device.isDevice || Constants.executionEnvironment === 'storeClient') {
      setStatus(null, 'local-only');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId
      ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId) {
      setStatus(null, 'missing-project');
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiClient.post('/users/push-token', {
      expoPushToken: token,
      platform: Platform.OS,
      projectId,
    });
    setStatus(token, 'registered');
    return token;
  } catch (error) {
    setStatus(null, 'error');
    throw error;
  }
}

export async function revokePushTokenAsync(token: string | null = useAuthStore.getState().expoPushToken): Promise<void> {
  if (!token) return;
  await apiClient.delete('/users/push-token', { data: { expoPushToken: token } });
}

export async function scheduleLocalTestNotificationAsync(target?: {
  requestId: string;
  enterpriseId?: number;
}): Promise<string> {
  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  if (!permission.granted) throw new Error('Autorisez les notifications dans les réglages de cet appareil pour lancer le test local.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OPERATIONAL_REQUESTS_CHANNEL_ID, {
      name: 'Demandes opérationnelles',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title: target ? 'Nouvelle demande' : 'Test des notifications',
      body: target ? 'Touchez pour ouvrir la demande opérationnelle.' : 'Le son et les vibrations sont activés.',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: OPERATIONAL_REQUESTS_CHANNEL_ID } : {}),
      data: target
        ? {
            link: `/dashboard/demandes-operationnelles?request=${encodeURIComponent(target.requestId)}`,
            ...(target.enterpriseId !== undefined ? { enterpriseId: target.enterpriseId } : {}),
          }
        : {},
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
}
