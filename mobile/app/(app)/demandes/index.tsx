import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { operationalRequestsService } from '@/api/operationalRequests';
import type { OperationalRequest, OperationalRequestStatus } from '@/types/operationalRequest';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';

const statusLabels: Record<OperationalRequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'À valider',
  NEEDS_INFO: 'À compléter',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  IN_FINANCIAL_PROCESS: 'Traitement financier',
  CASH_VOUCHER_CREATED: 'Bon de caisse créé',
  DISBURSED: 'Décaissée',
  CLOSED: 'Clôturée',
};

const typeLabels: Record<string, string> = {
  FUEL: 'Carburant',
  TRANSPORT: 'Transport',
  MISSION: 'Mission / planning',
  OTHER: 'Autre dépense',
  PROCUREMENT: 'Achats / approvisionnement',
};

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    if (error.response?.status === 403) {
      return 'Votre compte n’a pas le droit de consulter les demandes opérationnelles. Demandez à l’administrateur de vérifier vos permissions.';
    }
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Impossible de charger vos demandes. Vérifiez votre connexion puis réessayez.';
};

const formatAmount = (value: string | number, currency: string): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
};

function RequestCard({ request }: { request: OperationalRequest }): JSX.Element {
  const { colors } = useTheme();
  return (
    <Card
      mode="outlined"
      onPress={() => router.push(`/demandes/${encodeURIComponent(request.id)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${request.requestNumber}, ${request.beneficiaryName}, ${statusLabels[request.status]}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeading}>
          <View style={styles.cardTitle}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              {request.requestNumber} · {typeLabels[request.type] ?? request.type}
            </Text>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
              {request.beneficiaryName}
            </Text>
          </View>
          <Chip compact>{statusLabels[request.status] ?? request.status}</Chip>
        </View>
        <Text variant="bodyMedium" numberOfLines={2} style={{ color: colors.onSurfaceVariant }}>
          {request.reason}
        </Text>
        <View style={styles.cardFooter}>
          <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
            {formatAmount(request.amountApproved ?? request.amountRequested, request.currency || 'XOF')}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {formatDate(request.createdAt)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function OperationalRequestsScreen(): JSX.Element {
  const userId = useAuthStore((state) => state.user?.id);
  const enterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  const enterpriseName = useEnterpriseStore((state) => state.activeEnterpriseName);
  const { colors } = useTheme();
  const requestsQuery = useQuery({
    queryKey: ['mobile-operational-requests', userId, enterpriseId],
    queryFn: () => operationalRequestsService.list({ mine: true, page: 1, limit: 100 }),
    enabled: Boolean(userId && enterpriseId !== null),
  });
  const requests = requestsQuery.data?.data ?? [];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={requestsQuery.isRefetching}
            onRefresh={() => void requestsQuery.refetch()}
            tintColor={colors.primary}
          />
        )}
      >
        <View style={styles.heading}>
          <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
            Mes demandes opérationnelles
          </Text>
          {enterpriseName ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{enterpriseName}</Text> : null}
        </View>

        {enterpriseId === null ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.emptyContent}>
              <Text style={{ color: colors.onSurfaceVariant }}>Choisissez une entreprise pour afficher vos demandes.</Text>
              <Button mode="contained" onPress={() => router.push('/selection-entreprise')}>Choisir une entreprise</Button>
            </Card.Content>
          </Card>
        ) : null}

        {requestsQuery.isPending && enterpriseId !== null ? (
          <ActivityIndicator accessibilityLabel="Chargement des demandes" style={styles.loading} />
        ) : null}

        {requestsQuery.isError ? (
          <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Card.Content style={styles.emptyContent}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{getErrorMessage(requestsQuery.error)}</Text>
              <Button mode="contained" onPress={() => void requestsQuery.refetch()}>Réessayer</Button>
            </Card.Content>
          </Card>
        ) : null}

        {!requestsQuery.isPending && !requestsQuery.isError && enterpriseId !== null && requests.length === 0 ? (
          <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Card.Content style={styles.emptyContent}>
              <Text style={{ color: colors.onSurfaceVariant }}>Aucune demande opérationnelle ne correspond à cette entreprise.</Text>
              <Button mode="outlined" onPress={() => router.push('/selection-entreprise')}>
                Changer d’entreprise
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {requests.map((request) => <RequestCard key={request.id} request={request} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heading: { gap: 4, marginBottom: 4 },
  loading: { marginTop: 28 },
  card: { borderRadius: 12 },
  cardContent: { gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, gap: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emptyContent: { gap: 12 },
});
