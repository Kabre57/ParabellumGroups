import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Lightweight SSE listener to keep notifications in sync in near‑real‑time.
 * Relies on the API gateway allowing ?token=<jwt> for EventSource.
 */
export function useNotificationStream(enabled = true) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isAuthenticated || typeof window === 'undefined') {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

    const handleMessage = () => {
      // Simply invalidate; React Query will refetch and merge
      queryClient.invalidateQueries({ queryKey: ['notifications'] }).catch(() => {});
    };

    source.onmessage = handleMessage;
    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [enabled, isAuthenticated, queryClient]);
}
