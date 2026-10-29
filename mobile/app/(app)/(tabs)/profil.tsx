import { router } from 'expo-router';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationSettings } from '@/components/NotificationSettings';
import { authService } from '@/api/auth';
import { useLogout } from '@/hooks/useLogout';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';

export default function ProfileScreen(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const activeEnterpriseName = useEnterpriseStore((state) => state.activeEnterpriseName);
  const activeEnterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  const { logout, isLoggingOut, logoutError } = useLogout();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!user || activeEnterpriseId !== null) return;
    let active = true;
    void authService.enterprises().then((enterprises) => {
      if (!active) return;
      const store = useEnterpriseStore.getState();
      store.setEnterprises(enterprises);
      const preferred = enterprises.find(({ id }) => id === user.enterpriseId);
      const selection = preferred ?? (enterprises.length === 1 ? enterprises[0] : undefined);
      if (selection) {
        store.setActive(selection);
      } else {
        router.replace('/selection-entreprise');
      }
    }).catch(() => {
      if (!active) return;
      useToastStore.getState().show('Impossible de retrouver votre entreprise active. Choisissez une entreprise pour continuer.', 'error');
      router.replace('/selection-entreprise');
    });
    return () => {
      active = false;
    };
  }, [activeEnterpriseId, user]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.secondaryText}>Votre session n’est plus disponible.</Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/login')}
          contentStyle={styles.buttonContent}
          style={styles.button}
        >
          Se connecter
        </Button>
      </View>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="titleLarge" style={styles.primaryText}>
            {fullName || user.email}
          </Text>
          <Text variant="bodyMedium" style={styles.secondaryText} selectable>
            {user.email}
          </Text>
          <Text variant="bodySmall" style={styles.secondaryText}>Rôle</Text>
          <Text variant="bodyMedium" style={styles.primaryText}>
            {user.role || 'Rôle non renseigné'}
          </Text>
        </Card.Content>
      </Card>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="titleMedium" style={styles.primaryText}>Entreprise active</Text>
          <Text variant="bodyMedium" style={styles.secondaryText}>
            {activeEnterpriseName ?? (activeEnterpriseId === null ? 'Chargement de l’entreprise…' : 'Aucune entreprise sélectionnée')}
          </Text>
          <Button
            mode="outlined"
            textColor="#334155"
            disabled={isLoggingOut}
            onPress={() => router.push('/selection-entreprise')}
            contentStyle={styles.buttonContent}
            style={styles.secondaryButton}
          >
            Changer
          </Button>
        </Card.Content>
      </Card>
      <NotificationSettings disabled={isLoggingOut} />
      {logoutError ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.content}>
            <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text>
            <Button
              mode="contained"
              disabled={isLoggingOut}
              onPress={() => void logout()}
              contentStyle={styles.buttonContent}
              style={styles.button}
            >
              Réessayer
            </Button>
          </Card.Content>
        </Card>
      ) : null}
      <Button
        mode="outlined"
        textColor="#e11d48"
        loading={isLoggingOut}
        disabled={isLoggingOut}
        onPress={() => void logout()}
        contentStyle={styles.buttonContent}
        style={styles.logoutButton}
      >
        Se déconnecter
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 12, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', padding: 16, gap: 12, backgroundColor: '#f8fafc' },
  card: {
    borderRadius: 12, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  content: { gap: 8 },
  primaryText: { color: '#0f172a' },
  secondaryText: { color: '#64748b' },
  error: { color: '#e11d48' },
  button: { borderRadius: 8 },
  secondaryButton: { borderRadius: 8, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  logoutButton: { borderRadius: 8, borderColor: '#e11d48', backgroundColor: '#ffffff' },
  buttonContent: { minHeight: 44 },
});
