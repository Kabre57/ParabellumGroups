import { useEffect, useState, type JSX } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';

import { authService } from '@/api/auth';
import type { Enterprise } from '@/stores/enterpriseStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';

export default function SelectEnterpriseScreen(): JSX.Element {
  const enterprises = useEnterpriseStore((state) => state.enterprises);
  const setEnterprises = useEnterpriseStore((state) => state.setEnterprises);
  const setActive = useEnterpriseStore((state) => state.setActive);
  const [loading, setLoading] = useState(enterprises.length === 0);

  useEffect(() => {
    if (enterprises.length > 0) return;
    let active = true;
    void authService.enterprises().then((items) => {
      if (!active) return;
      setEnterprises(items);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      useToastStore.getState().show('Impossible de charger les entreprises. Réessayez.', 'error');
    });
    return () => { active = false; };
  }, [enterprises.length, setEnterprises]);

  const choose = (enterprise: Enterprise): void => {
    setActive(enterprise);
    router.replace('/demandes');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>Choisir une entreprise</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Sélectionnez l’espace dans lequel vous souhaitez travailler.</Text>
        {loading ? <ActivityIndicator style={styles.loading} /> : enterprises.map((enterprise) => (
          <Card key={enterprise.id} mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.nameWrap}><Text variant="titleMedium">{enterprise.name}</Text></View>
              <Button mode="contained" onPress={() => choose(enterprise)}>Continuer</Button>
            </Card.Content>
          </Card>
        ))}
        {!loading && enterprises.length === 0 ? <Text style={styles.empty}>Aucune entreprise n’est accessible à ce compte.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 20, gap: 14 },
  title: { color: '#111827', fontWeight: '700' },
  subtitle: { color: '#64748b', marginBottom: 6 },
  loading: { marginTop: 32 },
  card: { borderColor: '#e2e8f0', backgroundColor: '#fff' },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameWrap: { flex: 1 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
