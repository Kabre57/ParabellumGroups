import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

type ToastState = {
  visible: boolean;
  message: string;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  kind: 'info',
  show: (message, kind = 'info') => set({ visible: true, message, kind }),
  hide: () => set({ visible: false }),
}));
