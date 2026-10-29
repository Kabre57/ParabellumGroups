import type { JSX } from 'react';
import { Snackbar } from 'react-native-paper';

import { useToastStore } from '@/stores/toastStore';

const backgroundByKind = {
  info: '#1d4ed8',
  success: '#15803d',
  error: '#be123c',
} as const;

export function Toast(): JSX.Element {
  const visible = useToastStore((state) => state.visible);
  const message = useToastStore((state) => state.message);
  const kind = useToastStore((state) => state.kind);
  const hide = useToastStore((state) => state.hide);

  return (
    <Snackbar
      visible={visible}
      onDismiss={hide}
      duration={3500}
      style={{ backgroundColor: backgroundByKind[kind] }}
      accessibilityLiveRegion="polite"
    >
      {message}
    </Snackbar>
  );
}
