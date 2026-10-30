import { Stack } from 'expo-router';
import type { JSX } from 'react';

export default function OperationalRequestsLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
