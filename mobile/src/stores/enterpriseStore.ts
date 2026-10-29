import { create } from 'zustand';

export type Enterprise = {
  id: number;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  parentEnterpriseId?: number | null;
};

type EnterpriseState = {
  enterprises: Enterprise[];
  activeEnterpriseId: number | null;
  activeEnterpriseName: string | null;
  setEnterprises: (enterprises: Enterprise[]) => void;
  setActive: (enterprise: Enterprise) => void;
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
  clear: () => set(initialState),
}));
