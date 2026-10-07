'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '@/shared/api/shared/client';
import type { Enterprise } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { hasAnyPermission, isAdminRole } from '@/shared/permissions';
import { useAuth } from '@/shared/providers/AuthProvider';

export type { Enterprise };

export interface EnterpriseContextType {
  selectedEnterprise: Enterprise | null;
  isAccountingConsolidated: boolean;
  enterprises: Enterprise[];
  isLoadingEnterprises: boolean;
  enterpriseLoadError: string | null;
  selectEnterprise: (enterprise: Enterprise) => void;
  setAccountingConsolidated: (enabled: boolean) => void;
  refreshEnterprises: () => Promise<Enterprise[]>;
  clearSelectedEnterprise: () => void;
  prepareForEnterpriseSelection: () => void;
}

const ENTERPRISE_STORAGE_KEY = 'selectedEnterpriseId';

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined);

const normalizeEnterpriseList = (payload: unknown): Enterprise[] => {
  if (Array.isArray(payload)) return payload as Enterprise[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as { data?: unknown; enterprises?: unknown; items?: unknown };
  if (Array.isArray(record.enterprises)) return record.enterprises as Enterprise[];
  if (Array.isArray(record.items)) return record.items as Enterprise[];
  if (Array.isArray(record.data)) return record.data as Enterprise[];
  return [];
};

export function EnterpriseProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [isAccountingConsolidated, setIsAccountingConsolidated] = useState(false);
  const [isLoadingEnterprises, setIsLoadingEnterprises] = useState(true);
  const [enterpriseLoadError, setEnterpriseLoadError] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  const applySelection = useCallback((enterprise: Enterprise) => {
    setSelectedEnterprise(enterprise);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENTERPRISE_STORAGE_KEY, String(enterprise.id));
    }
    apiClient.setEnterpriseId(String(enterprise.id));
  }, []);

  const clearSelectedEnterprise = useCallback(() => {
    setSelectedEnterprise(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ENTERPRISE_STORAGE_KEY);
    }
    apiClient.setEnterpriseId(null);
  }, []);

  const prepareForEnterpriseSelection = useCallback(() => {
    requestGeneration.current += 1;
    setEnterprises([]);
    setEnterpriseLoadError(null);
    setIsLoadingEnterprises(true);
    clearSelectedEnterprise();
  }, [clearSelectedEnterprise]);

  const fetchEnterprises = useCallback(async (): Promise<Enterprise[]> => {
    const requestId = ++requestGeneration.current;
    try {
      setIsLoadingEnterprises(true);
      setEnterpriseLoadError(null);

      // Reuse the same gateway route as the rest of the enterprise API.
      const response = await apiClient.get<{ success?: boolean; data?: unknown }>(
        '/auth/enterprises'
      );
      if (requestGeneration.current !== requestId) return [];
      const list = [...normalizeEnterpriseList(response.data?.data)];
      const assignedId = user?.enterpriseId ?? user?.enterprise?.id;
      const assignedEnterprise = user?.enterprise;

      // `/me` contains the authenticated user's own enterprise. Keep it as a
      // fallback if the listing endpoint omits it, so a valid assignment never
      // turns into an empty selector.
      if (
        assignedId !== undefined &&
        assignedId !== null &&
        !list.some((enterprise) => String(enterprise.id) === String(assignedId))
      ) {
        list.push({
          id: assignedId,
          name: assignedEnterprise?.name || `Entreprise ${assignedId}`,
          logoUrl: assignedEnterprise?.logoUrl ?? undefined,
          isActive: true,
        });
      }

      const activeEnterprises = list.filter((enterprise) => enterprise.isActive !== false);
      const canAccessAllEnterprises =
        isAdminRole(user) || hasAnyPermission(user, ['enterprises.read_all']);
      const accessible = canAccessAllEnterprises
        ? getAccessibleEnterprises(activeEnterprises)
        : assignedId !== undefined && assignedId !== null
          ? getAccessibleEnterprises(activeEnterprises, assignedId)
          : [];
      setEnterprises(accessible);

      const savedId = localStorage.getItem(ENTERPRISE_STORAGE_KEY);
      const savedEnterprise = savedId
        ? accessible.find((enterprise) => String(enterprise.id) === savedId)
        : undefined;
      if (savedEnterprise) {
        // Restore the context on a page reload. A fresh login clears this key
        // before reaching this provider, so the user must choose explicitly.
        applySelection(savedEnterprise);
      } else {
        clearSelectedEnterprise();
      }

      return accessible;
    } catch (error) {
      if (requestGeneration.current !== requestId) return [];
      console.error('[EnterpriseProvider] Error fetching enterprises:', error);
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Impossible de charger les entreprises.';
      setEnterpriseLoadError(message);
      const assignedId = user?.enterpriseId ?? user?.enterprise?.id;
      const assignedEnterprise = user?.enterprise;
      const canAccessAllEnterprises =
        isAdminRole(user) || hasAnyPermission(user, ['enterprises.read_all']);
      const fallbackEnterprises: Enterprise[] =
        assignedId !== undefined && assignedId !== null
          ? [{
              id: assignedId,
              name: assignedEnterprise?.name || `Entreprise ${assignedId}`,
              logoUrl: assignedEnterprise?.logoUrl ?? undefined,
              isActive: true,
            }]
          : [];
      const accessibleFallback = canAccessAllEnterprises
        ? fallbackEnterprises
        : assignedId !== undefined && assignedId !== null
          ? getAccessibleEnterprises(fallbackEnterprises, assignedId)
          : [];
      setEnterprises(accessibleFallback);
      // Keep the assigned company selectable during an API outage, but never
      // choose it automatically. The page must wait for the user's click.
      clearSelectedEnterprise();
      return [];
    } finally {
      if (requestGeneration.current === requestId) {
        setIsLoadingEnterprises(false);
      }
    }
  }, [
    applySelection,
    clearSelectedEnterprise,
    user?.enterprise?.id,
    user?.enterprise?.logoUrl,
    user?.enterprise?.name,
    user?.enterpriseId,
    user?.permissions,
    user?.permissionsList,
    user?.role,
  ]);

  const refreshEnterprises = useCallback(() => fetchEnterprises(), [fetchEnterprises]);

  const selectEnterprise = useCallback((enterprise: Enterprise) => {
    applySelection(enterprise);
  }, [applySelection]);

  const setAccountingConsolidated = useCallback((enabled: boolean) => {
    setIsAccountingConsolidated(enabled && isAdminRole(user));
  }, [user]);

  useEffect(() => {
    if (!isAdminRole(user)) setIsAccountingConsolidated(false);
  }, [user]);

  useEffect(() => {
    setIsAccountingConsolidated(false);
  }, [selectedEnterprise?.id]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      requestGeneration.current += 1;
      setEnterprises([]);
      setEnterpriseLoadError(null);
      setIsLoadingEnterprises(false);
      clearSelectedEnterprise();
      return;
    }

    void fetchEnterprises();
    return () => {
      requestGeneration.current += 1;
    };
  }, [clearSelectedEnterprise, fetchEnterprises, isAuthLoading, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'accessToken' && !event.newValue) {
        setEnterprises([]);
        setEnterpriseLoadError(null);
        clearSelectedEnterprise();
        return;
      }

      if (event.key === ENTERPRISE_STORAGE_KEY) {
        const nextEnterprise = event.newValue
          ? enterprises.find((enterprise) => String(enterprise.id) === event.newValue)
          : undefined;
        if (nextEnterprise) {
          applySelection(nextEnterprise);
        } else {
          setSelectedEnterprise(null);
          apiClient.setEnterpriseId(null);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applySelection, clearSelectedEnterprise, enterprises]);

  return (
    <EnterpriseContext.Provider
      value={{
        selectedEnterprise,
        isAccountingConsolidated,
        enterprises,
        isLoadingEnterprises,
        enterpriseLoadError,
        selectEnterprise,
        setAccountingConsolidated,
        refreshEnterprises,
        clearSelectedEnterprise,
        prepareForEnterpriseSelection,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
}

export function useEnterprise() {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
}
