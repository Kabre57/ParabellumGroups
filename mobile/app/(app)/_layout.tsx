import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useEffect, useState, type JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authService } from '@/api/auth';
import { AppDrawerContent } from '@/components/layout/AppDrawerContent';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

type AuthCheck = { status: 'checking' | 'ready' } | { status: 'error'; message: string };

const getSessionError = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Impossible de vérifier votre session. Vérifiez votre connexion puis réessayez.';
};

export default function AppLayout(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [check, setCheck] = useState<AuthCheck>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const verifySession = async (): Promise<void> => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (!active) return;
        if (!token) {
          useAuthStore.getState().logout();
          queryClient.clear();
          router.replace('/login');
          return;
        }

        if (!useAuthStore.getState().user) {
          const restoredUser = await authService.me();
          if (!active) return;
          const currentToken = await SecureStore.getItemAsync('access_token');
          if (!active) return;
          if (currentToken !== token) {
            if (!currentToken) {
              useAuthStore.getState().logout();
              queryClient.clear();
              router.replace('/login');
            } else {
              setAttempt((value) => value + 1);
            }
            return;
          }
          useAuthStore.getState().setUser(restoredUser);
        }

        if (active) setCheck({ status: 'ready' });
      } catch (error: unknown) {
        if (!active) return;
        if (isAxiosError(error) && error.response?.status === 401) {
          try {
            await SecureStore.deleteItemAsync('access_token');
          } catch {
            // La session locale doit être fermée même si SecureStore échoue.
          }
          if (!active) return;
          useAuthStore.getState().logout();
          queryClient.clear();
          router.replace('/login');
          return;
        }
        const message = getSessionError(error);
        setCheck({ status: 'error', message });
        useToastStore.getState().show(message, 'error');
      }
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, [attempt, queryClient]);

  useEffect(() => {
    if (check.status === 'ready' && !user) {
      queryClient.clear();
      router.replace('/login');
    }
  }, [check.status, queryClient, user]);

  if (check.status === 'ready' && user) {
    return (
      <Drawer
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          header: ({ options, route }) => <AppHeader title={options.title ?? route.name} />,
          sceneStyle: { backgroundColor: '#f8fafc' },
          drawerStyle: { backgroundColor: '#ffffff' },
          drawerType: 'front',
        }}
      >
        <Drawer.Screen name="index" options={{ headerShown: false }} />
        <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
        <Drawer.Screen name="selection-entreprise" options={{ title: 'Choisir une entreprise' }} />
        <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Drawer>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {check.status === 'error' ? (
        <View style={styles.center}>
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.content}>
              <Text accessibilityRole="alert" style={styles.message}>
                {check.message}
              </Text>
              <Button
                mode="contained"
                contentStyle={styles.buttonContent}
                style={styles.button}
                onPress={() => {
                  setCheck({ status: 'checking' });
                  setAttempt((value) => value + 1);
                }}
              >
                Réessayer
              </Button>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" accessibilityLabel="Vérification de la session" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 12,
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  content: { gap: 12 },
  message: { color: '#64748b' },
  button: { borderRadius: 8 },
  buttonContent: { minHeight: 44 },
});
