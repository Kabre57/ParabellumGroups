import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from 'expo-router/drawer';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { authService } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

export function AppDrawerContent(props: DrawerContentComponentProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const signOut = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } finally {
      useAuthStore.getState().logout();
      queryClient.clear();
      router.replace('/login');
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.account}>
        <Text variant="titleMedium" style={styles.name}>{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Compte connecté'}</Text>
        <Text variant="bodySmall" style={styles.email}>{user?.email || ''}</Text>
      </View>
      <DrawerItemList {...props} />
      <Button mode="text" onPress={() => void signOut()} style={styles.signOut} textColor="#be123c">
        Se déconnecter
      </Button>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  account: { paddingHorizontal: 20, paddingVertical: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0', marginBottom: 8 },
  name: { color: '#0f172a', fontWeight: '700' },
  email: { color: '#64748b', marginTop: 3 },
  signOut: { marginTop: 'auto', marginHorizontal: 12 },
});
