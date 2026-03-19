'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { authService } from '@/shared/api/auth';
import { User } from '@/shared/api/shared/types';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_STORAGE_KEY = 'lastActivityAt';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimeoutRef = useRef<number | null>(null);

  const clearInactivityTimer = useCallback(() => {
    if (typeof window === 'undefined' || inactivityTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = null;
  }, []);

  const clearStoredAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  }, []);

  const getLastActivityAt = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawValue = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const timestamp = Number(rawValue);
    return Number.isFinite(timestamp) ? timestamp : null;
  }, []);

  const markActivity = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
  }, []);

  const performLogout = useCallback(async () => {
    clearInactivityTimer();
    await authService.logout();
    clearStoredAuth();
    setUser(null);
  }, [clearInactivityTimer, clearStoredAuth]);

  const isSessionExpired = useCallback(() => {
    const lastActivityAt = getLastActivityAt();
    if (!lastActivityAt) {
      return false;
    }

    return Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS;
  }, [getLastActivityAt]);

  const scheduleAutoLogout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    clearInactivityTimer();

    const lastActivityAt = getLastActivityAt() ?? Date.now();
    const remainingTime = INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt);

    if (remainingTime <= 0) {
      void performLogout();
      return;
    }

    inactivityTimeoutRef.current = window.setTimeout(() => {
      void performLogout();
    }, remainingTime);
  }, [clearInactivityTimer, getLastActivityAt, performLogout]);

  const loadUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch {
      clearStoredAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [clearStoredAuth]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      if (isSessionExpired()) {
        void performLogout().finally(() => setIsLoading(false));
        return;
      }
      void loadUser();
    } else {
      setIsLoading(false);
    }
  }, [isSessionExpired, loadUser, performLogout]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    markActivity();
    setUser(response.user);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await authService.register({ email, password, firstName, lastName });
    markActivity();
    setUser(response.user);
  };

  const logout = useCallback(async () => {
    await performLogout();
  }, [performLogout]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      clearInactivityTimer();
      return;
    }

    if (!getLastActivityAt()) {
      markActivity();
    }

    scheduleAutoLogout();

    const handleActivity = () => {
      markActivity();
      scheduleAutoLogout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleAutoLogout();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'accessToken' && !event.newValue) {
        clearInactivityTimer();
        setUser(null);
        return;
      }

      if (event.key === LAST_ACTIVITY_STORAGE_KEY) {
        scheduleAutoLogout();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      clearInactivityTimer();
    };
  }, [
    clearInactivityTimer,
    getLastActivityAt,
    markActivity,
    scheduleAutoLogout,
    user,
  ]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

