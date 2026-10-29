import { router } from 'expo-router';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';

export default function HomeScreen(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const enterpriseName = useEnterpriseStore((state) => state.activeEnterpriseName);

  return (
    <View style={styles.container}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>Bienvenue sur Parabellum Groups</Text>
          <Text variant="bodyMedium" style={styles.body}>{user?.firstName ? `Bonjour ${user.firstName}.` : 'Votre session est ouverte.'}</Text>
          <Text variant="bodySmall" style={styles.enterprise}>{enterpriseName || 'Aucune entreprise sélectionnée'}</Text>
          <Button mode="contained" onPress={() => router.push('/profil')}>Mon profil</Button>
          <Button mode="outlined" onPress={() => router.push('/selection-entreprise')}>Changer d’entreprise</Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  card: { borderColor: '#e2e8f0', backgroundColor: '#fff' },
  content: { gap: 12, paddingVertical: 16 },
  title: { color: '#111827', fontWeight: '700', textAlign: 'center' },
  body: { color: '#475569', textAlign: 'center' },
  enterprise: { color: '#64748b', textAlign: 'center', marginBottom: 8 },
});
