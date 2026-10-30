import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type Enterprise = {
  id: number;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  parentEnterpriseId?: number | null;
};

const preferenceKey = (userId: string): string => `active_enterprise:${userId}`;

export async function savePreferredEnterprise(userId: string, enterprise: Enterprise): Promise<void> {
  try {
    await SecureStore.setItemAsync(preferenceKey(userId), String(enterprise.id));
  } catch {
    // La préférence est facultative : elle ne doit pas bloquer la connexion ou le changement d’entreprise.
  }
}

export async function loadPreferredEnterprise(
  userId: string,
  enterprises: Enterprise[],
): Promise<Enterprise | undefined> {
  try {
    const storedId = await SecureStore.getItemAsync(preferenceKey(userId));
    if (!storedId) return undefined;
    return enterprises.find((enterprise) => Number(enterprise.id) === Number(storedId));
  } catch {
    return undefined;
  }
}

type EnterpriseState = {
  enterprises: Enterprise[];
  activeEnterpriseId: number | null;
  activeEnterpriseName: string | null;
  setEnterprises: (enterprises: Enterprise[]) => void;
  setActive: (enterprise: Enterprise) => void;
  clearActive: () => void;
  clear: () => void;
};

const initialState = {
  enterprises: [] as Enterprise[],
  activeEnterpriseId: null as number | null,
  activeEnterpriseName: null as string | null,
};

export const useEnterpriseStore = create<EnterpriseState>((set) => ({
  ...initialState,
  setEnterprises: (enterprises) => set({ enterprises }),
  setActive: (enterprise) => set({
    activeEnterpriseId: enterprise.id,
    activeEnterpriseName: enterprise.name,
  }),
  clearActive: () => set({ activeEnterpriseId: null, activeEnterpriseName: null }),
  clear: () => set(initialState),
}));
