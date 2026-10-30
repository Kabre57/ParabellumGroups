import { isAxiosError } from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { operationalRequestsService } from '@/api/operationalRequests';
import type { OperationalRequestStatus } from '@/types/operationalRequest';

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

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatAmount = (value: string | number, currency: string): string => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)} ${currency}`
    : `${value} ${currency}`;
};

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Impossible de charger cette demande. Vérifiez votre connexion puis réessayez.';
};

function Field({ label, value }: { label: string; value?: string | null }): JSX.Element | null {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text variant="labelMedium" style={styles.label}>{label}</Text>
      <Text variant="bodyLarge" style={styles.value}>{value}</Text>
    </View>
  );
}

export default function OperationalRequestDetailScreen(): JSX.Element {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { colors } = useTheme();
  const requestQuery = useQuery({
    queryKey: ['mobile-operational-request', id],
    queryFn: () => operationalRequestsService.get(id!),
    enabled: Boolean(id),
  });
  const request = requestQuery.data;
  const approvalLogs = request?.approvalLogs ?? [];
  const attachments = request?.attachments ?? [];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {request ? <Button mode="text" onPress={() => router.back()}>Retour aux demandes</Button> : null}
        {requestQuery.isPending ? <ActivityIndicator accessibilityLabel="Chargement de la demande" style={styles.loading} /> : null}
        {requestQuery.isError ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{getErrorMessage(requestQuery.error)}</Text>
              <Button mode="contained" onPress={() => void requestQuery.refetch()}>Réessayer</Button>
              <Button mode="text" onPress={() => router.back()}>Retour aux demandes</Button>
            </Card.Content>
          </Card>
        ) : null}
        {request ? (
          <>
            <Card mode="outlined" style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.heading}>
                  <View style={styles.headingText}>
                    <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{request.requestNumber}</Text>
                    <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
                      {typeLabels[request.type] ?? request.type}
                    </Text>
                  </View>
                  <Chip compact>{statusLabels[request.status] ?? request.status}</Chip>
                </View>
                <Divider />
                <Field label="Bénéficiaire" value={request.beneficiaryName} />
                <Field label="Montant demandé" value={formatAmount(request.amountRequested, request.currency || 'XOF')} />
                {request.amountApproved !== null && request.amountApproved !== undefined ? (
                  <Field label="Montant approuvé" value={formatAmount(request.amountApproved, request.currency || 'XOF')} />
                ) : null}
                <Field label="Entreprise" value={request.enterpriseName} />
                <Field label="Service" value={request.serviceName} />
                <Field label="Demandeur" value={request.requesterName} />
                <Field label="Date souhaitée" value={formatDate(request.desiredDate)} />
                <Field label="Créée le" value={formatDate(request.createdAt)} />
                <Field label="Motif" value={request.reason} />
                <Field label="Commentaire de décision" value={request.decisionComment} />
              </Card.Content>
            </Card>

            {approvalLogs.length > 0 ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>Historique</Text>
                  {approvalLogs.map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <Text variant="bodyMedium" style={{ color: colors.onSurface }}>{log.actorName} · {statusLabels[log.toStatus] ?? log.toStatus}</Text>
                      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{formatDate(log.createdAt)}</Text>
                      {log.comment ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>{log.comment}</Text> : null}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ) : null}

            {attachments.length > 0 ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>Pièces jointes</Text>
                  {attachments.map((attachment) => <Text key={attachment.id} style={{ color: colors.onSurfaceVariant }}>{attachment.fileName}</Text>)}
                </Card.Content>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  loading: { marginTop: 28 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  cardContent: { gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headingText: { flex: 1, gap: 4 },
  field: { gap: 3 },
  label: { color: '#64748b' },
  value: { color: '#0f172a' },
  logItem: { gap: 4, borderLeftWidth: 2, borderLeftColor: '#cbd5e1', paddingLeft: 12 },
});
