import Constants from 'expo-constants';
import { isAxiosError } from 'axios';
import { useState, type JSX } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import { registerForPushNotificationsAsync, scheduleLocalTestNotificationAsync } from '@/services/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';

const statusMessages = {
  idle: 'Autorisez les notifications pour être informé des nouvelles demandes et de leur traitement.',
  registering: 'Activation des notifications…',
  registered: 'Notifications autorisées sur cet appareil.',
  'local-only': 'Notifications locales autorisées sur cet appareil.',
  denied: 'Les notifications sont désactivées. Vous pouvez les autoriser dans les réglages de cet appareil.',
  unavailable: 'Les notifications sont indisponibles sur cet appareil.',
  error: 'L’activation a échoué. Vérifiez votre connexion puis réessayez.',
  'missing-project': 'L’activation des notifications distantes n’est pas encore disponible. Vous pouvez réessayer plus tard.',
};

export function NotificationSettings({ disabled = false }: { disabled?: boolean }): JSX.Element {
  const status = useAuthStore((state) => state.notificationRegistrationStatus);
  const enterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  const isExpoGo = Constants.appOwnership === 'expo';
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'register' | 'test' | 'settings' | null>(null);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isBusy = disabled || busy !== null || status === 'registering';

  const activate = async (): Promise<void> => {
    if (isBusy) return;
    setBusy('register');
    setError(null);
    try {
      await registerForPushNotificationsAsync();
    } catch (failure: unknown) {
      setError(isAxiosError(failure)
        ? 'Impossible d’enregistrer le token sur le serveur. Vérifiez que l’API est accessible puis réessayez.'
        : 'Impossible d’activer les notifications. Vérifiez les réglages de cet appareil puis réessayez.');
    } finally {
      setBusy(null);
    }
  };

  const openSettings = async (): Promise<void> => {
    if (isBusy) return;
    setBusy('settings');
    setError(null);
    try {
      await Linking.openSettings();
    } catch {
      setError('Impossible d’ouvrir les réglages de cet appareil.');
    } finally {
      setBusy(null);
    }
  };

  const testNotification = async (): Promise<void> => {
    if (isBusy) return;
    setBusy('test');
    setError(null);
    const id = requestId.trim();
    try {
      await scheduleLocalTestNotificationAsync(id ? {
        requestId: id,
        ...(enterpriseId !== null ? { enterpriseId } : {}),
      } : undefined);
      useToastStore.getState().show('Notification de test programmée.', 'info');
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Impossible de programmer la notification de test.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium" style={{ color: colors.onSurface }}>Notifications</Text>
        <Text variant="bodyMedium" accessibilityLiveRegion="polite" style={{ color: colors.onSurfaceVariant }}>
          {isExpoGo ? 'Les notifications Push nécessitent une version de test (APK).' : statusMessages[status]}
        </Text>
        <Button
          mode="outlined"
          loading={busy === 'register' || status === 'registering'}
          disabled={isBusy || isExpoGo}
          onPress={() => void activate()}
          contentStyle={styles.buttonContent}
          style={styles.button}
        >
          {status === 'registered' || status === 'local-only' ? 'Vérifier les notifications' : 'Activer les notifications'}
        </Button>
        {status === 'denied' ? (
          <Button
            mode="text"
            disabled={isBusy}
            loading={busy === 'settings'}
            onPress={() => void openSettings()}
            contentStyle={styles.buttonContent}
            style={styles.button}
          >
            Ouvrir les réglages
          </Button>
        ) : null}
        {__DEV__ ? (
          <View style={styles.testSection}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Test local : la notification apparaîtra dans quelques secondes. Renseignez une demande pour tester son ouverture.
            </Text>
            <TextInput
              mode="outlined"
              label="Identifiant de demande (facultatif)"
              accessibilityLabel="Identifiant de demande pour le test de notification"
              value={requestId}
              onChangeText={setRequestId}
              autoCapitalize="none"
              autoCorrect={false}
              disabled={isBusy}
              style={{ backgroundColor: colors.surface }}
            />
            <Button
              mode="text"
              disabled={isBusy}
              loading={busy === 'test'}
              onPress={() => void testNotification()}
              contentStyle={styles.buttonContent}
              style={styles.button}
            >
              Tester une notification locale
            </Button>
          </View>
        ) : null}
        {error ? <HelperText type="error" accessibilityRole="alert">{error}</HelperText> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12 },
  content: { gap: 8 },
  testSection: { gap: 8, marginTop: 8 },
  button: { borderRadius: 8 },
  buttonContent: { minHeight: 44 },
});
