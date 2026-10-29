import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { useAuthStore } from '@/stores/authStore';
import { revokePushTokenAsync } from '@/services/notificationService';
import { useToastStore } from '@/stores/toastStore';

export function useLogout(): {
  logout: () => Promise<void>;
  isLoggingOut: boolean;
  logoutError: string | null;
} {
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const logout = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      try {
        await revokePushTokenAsync();
      } catch {
        // Une panne réseau ne doit pas empêcher la fermeture de session locale.
      }
      await SecureStore.deleteItemAsync('access_token');
      // Le store ferme aussi le contexte de l'entreprise active.
      useAuthStore.getState().logout();
      queryClient.clear();
      router.replace('/login');
    } catch {
      const message = 'Impossible de vous déconnecter. Réessayez.';
      setLogoutError(message);
      useToastStore.getState().show(message, 'error');
    } finally {
      pending.current = false;
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut, logoutError };
}
