import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

let sharedSource: EventSource | null = null;
let sharedToken = '';
let subscriberCount = 0;
let lastInvalidationAt = 0;
const invalidateSubscribers = new Set<() => void>();

const ensureSharedSource = (token: string) => {
  if (sharedSource && sharedToken === token) {
    return sharedSource;
  }

  if (sharedSource) {
    sharedSource.close();
  }

  sharedToken = token;
  sharedSource = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);

  sharedSource.onmessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data);

      // Ignore handshake and heartbeat frames, otherwise the SSE stream
      // itself creates a refetch loop against notifications/messages.
      if (payload?.type !== 'NOTIFICATION') {
        return;
      }
    } catch {
      return;
    }

    const now = Date.now();
    if (now - lastInvalidationAt < 2000) {
      return;
    }

    lastInvalidationAt = now;
    invalidateSubscribers.forEach((invalidate) => invalidate());
  };

  sharedSource.onerror = () => {
    sharedSource?.close();
    sharedSource = null;
    sharedToken = '';
  };

  return sharedSource;
};

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

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] }).catch(() => {});
    };

    invalidateSubscribers.add(invalidate);
    subscriberCount += 1;
    ensureSharedSource(token);

    return () => {
      invalidateSubscribers.delete(invalidate);
      subscriberCount = Math.max(0, subscriberCount - 1);

      if (subscriberCount === 0 && sharedSource) {
        sharedSource.close();
        sharedSource = null;
        sharedToken = '';
      }
    };
  }, [enabled, isAuthenticated, queryClient]);
}
