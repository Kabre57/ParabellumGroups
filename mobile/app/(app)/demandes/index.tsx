import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { operationalRequestsService, type CreatePayload, type ListParams } from '@/api/operationalRequests';
import { OperationalRequestFormModal, newOperationalRequestForm, type OperationalRequestFormValues } from '@/components/OperationalRequestFormModal';
import { formatMoney } from '@/constants/format';
import { requestStatusLabels, requestTypeLabels, requestViews, type OperationalRequestView } from '@/constants/operationalRequests';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { hasExplicitPermission } from '@/utils/permissions';
import type { OperationalRequest } from '@/types/operationalRequest';

const pageSize = 50;

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    if (error.response?.status === 403) {
      return 'Ton compte n’a pas la permission nécessaire pour cette file. Demande à l’administrateur de vérifier les droits sur les demandes opérationnelles.';
    }
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Impossible de charger les demandes. Vérifie la connexion puis réessaie.';
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
};

function RequestCard({
  request,
  view,
  configuredTypes,
}: {
  request: OperationalRequest;
  view: OperationalRequestView;
  configuredTypes: { code: string; label: string }[];
}): JSX.Element {
  const { colors } = useTheme();
  const typeLabel = configuredTypes.find((item) => item.code === request.type)?.label ?? requestTypeLabels[request.type] ?? request.type;
  return (
    <Card
      mode="outlined"
      onPress={() => router.push(`/demandes/${encodeURIComponent(request.id)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${request.requestNumber}, ${request.beneficiaryName}, ${requestStatusLabels[request.status]}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeading}>
          <View style={styles.cardTitle}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              {request.requestNumber} · {typeLabel}
            </Text>
            <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
              {request.beneficiaryName}
            </Text>
          </View>
          <Chip compact>{requestStatusLabels[request.status] ?? request.status}</Chip>
        </View>
        {view !== 'mine' ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            Demandeur : {request.requesterName}{request.serviceName ? ` · ${request.serviceName}` : ''}
          </Text>
        ) : null}
        <Text variant="bodyMedium" numberOfLines={2} style={{ color: colors.onSurfaceVariant }}>
          {request.reason}
        </Text>
        <View style={styles.cardFooter}>
          <Text variant="titleSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
            {formatMoney(request.amountApproved ?? request.amountRequested, request.currency || 'XOF')}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{formatDate(request.createdAt)}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function OperationalRequestsScreen(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const enterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  const enterpriseName = useEnterpriseStore((state) => state.activeEnterpriseName);
  const enterprises = useEnterpriseStore((state) => state.enterprises);
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const canReadAll = isAdmin || hasExplicitPermission(user, 'operational_requests.read_all');
  const canReview = !isAdmin && hasExplicitPermission(user, 'operational_requests.approve');
  const canReject = !isAdmin && hasExplicitPermission(user, 'operational_requests.reject');
  const canReturn = !isAdmin && hasExplicitPermission(user, 'operational_requests.return');
  const canReviewQueue = canReview || canReject || canReturn;
  const canFinance = hasExplicitPermission(user, 'operational_requests.finance');
  const canCreate = isAdmin || hasExplicitPermission(user, 'operational_requests.create');
  const canReadTypes = canCreate || canReadAll || canFinance || hasExplicitPermission(user, 'operational_requests.read_own');
  const preferredView: OperationalRequestView = canReview
    ? 'review'
    : canFinance
      ? 'finance'
      : canReadAll
        ? 'all'
        : 'mine';

  const [manualView, setManualView] = useState<OperationalRequestView | null>(null);
  const isViewAvailable = (candidate: OperationalRequestView): boolean => {
    if (candidate === 'review') return canReviewQueue;
    if (candidate === 'finance') return canFinance;
    if (candidate === 'all') return canReadAll;
    return true;
  };
  const view = manualView && isViewAvailable(manualView) ? manualView : preferredView;
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<OperationalRequestFormValues>(newOperationalRequestForm());
  const [formError, setFormError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ['mobile-operational-request-types', enterpriseId],
    queryFn: () => operationalRequestsService.listTypes({ all: true }),
    enabled: Boolean(enterpriseId && canReadTypes),
  });
  const configuredTypes = typesQuery.data ?? [];

  const listParams: ListParams = view === 'mine'
    ? { mine: true, page, limit: pageSize }
    : view === 'review'
      ? { status: 'SUBMITTED', page, limit: pageSize }
      : view === 'finance'
        ? { financeQueue: true, page, limit: pageSize }
        : { page, limit: pageSize };

  const requestsQuery = useQuery({
    queryKey: ['mobile-operational-requests', user?.id, enterpriseId, view, page],
    queryFn: () => operationalRequestsService.list(listParams),
    enabled: Boolean(user?.id && enterpriseId !== null),
  });
  const requests = requestsQuery.data?.data ?? [];
  const meta = requestsQuery.data?.meta;

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) => operationalRequestsService.create(payload),
    onSuccess: async (request) => {
      setFormOpen(false);
      setForm(newOperationalRequestForm());
      setFormError(null);
      setManualView('mine');
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ['mobile-operational-requests', user?.id, enterpriseId] });
      router.push(`/demandes/${encodeURIComponent(request.id)}`);
    },
    onError: (error: unknown) => setFormError(getErrorMessage(error)),
  });

  const currentView = requestViews.find((item) => item.key === view)?.label ?? 'Mes demandes';
  const visibleViews = requestViews.filter((item) => isViewAvailable(item.key));

  const emptyMessage: Record<OperationalRequestView, string> = {
    mine: `Aucune demande créée par toi ne correspond à ${enterpriseName || 'cette entreprise'}.`,
    review: `Aucune demande soumise n’attend une décision dans ${enterpriseName || 'cette entreprise'}.`,
    finance: `Aucune demande approuvée n’attend un traitement financier dans ${enterpriseName || 'cette entreprise'}.`,
    all: `Aucune demande n’est visible dans le périmètre de ${enterpriseName || 'cette entreprise'}.`,
  };

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
          <View style={styles.headingText}>
            <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
              Demandes opérationnelles
            </Text>
            {enterpriseName ? <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>Entreprise active : {enterpriseName}</Text> : null}
          </View>
          {enterprises.length > 1 ? (
            <Button compact mode="outlined" onPress={() => router.push('/selection-entreprise')}>
              Changer d’entreprise
            </Button>
          ) : null}
        </View>

        {canCreate ? (
          <Button
            mode="contained"
            icon="plus"
            onPress={() => {
              setForm(newOperationalRequestForm());
              setFormError(null);
              setFormOpen(true);
            }}
            style={styles.createButton}
            contentStyle={styles.buttonContent}
          >
            Nouvelle demande
          </Button>
        ) : null}

        <View style={styles.viewHeader}>
          <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>{currentView}</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {view === 'mine' ? 'Demandes que tu as créées' : view === 'review' ? 'Demandes à décider' : view === 'finance' ? 'Demandes approuvées à payer' : 'Demandes visibles dans ton périmètre'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {visibleViews.map((item) => (
            <Button
              key={item.key}
              mode={view === item.key ? 'contained' : 'outlined'}
              compact
              onPress={() => {
                setManualView(item.key);
                setPage(1);
              }}
              style={styles.tabButton}
            >
              {item.label}
            </Button>
          ))}
        </ScrollView>

        {requestsQuery.isPending && enterpriseId !== null ? <ActivityIndicator accessibilityLabel="Chargement des demandes" style={styles.loading} /> : null}

        {requestsQuery.isError ? (
          <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error }]}>
            <Card.Content style={styles.emptyContent}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{getErrorMessage(requestsQuery.error)}</Text>
              <Button mode="contained" onPress={() => void requestsQuery.refetch()}>Réessayer</Button>
            </Card.Content>
          </Card>
        ) : null}

        {!requestsQuery.isPending && !requestsQuery.isError && enterpriseId !== null && requests.length === 0 ? (
          <Card mode="outlined" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>Aucune demande à afficher</Text>
              <Text style={{ color: colors.onSurfaceVariant }}>{emptyMessage[view]}</Text>
              {view === 'mine' && canCreate ? (
                <Button mode="contained" onPress={() => {
                  setForm(newOperationalRequestForm());
                  setFormError(null);
                  setFormOpen(true);
                }}>Créer une demande</Button>
              ) : null}
              {view !== 'mine' ? (
                <Button mode="outlined" onPress={() => {
                  setManualView('mine');
                  setPage(1);
                }}>Voir mes demandes</Button>
              ) : null}
            </Card.Content>
          </Card>
        ) : null}

        {requests.map((request) => (
          <RequestCard key={request.id} request={request} view={view} configuredTypes={configuredTypes} />
        ))}

        {meta && meta.totalPages > 1 ? (
          <View style={[styles.pagination, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {meta.total} demande{meta.total !== 1 ? 's' : ''} · page {meta.page}/{meta.totalPages}
            </Text>
            <View style={styles.paginationActions}>
              <Button compact mode="outlined" disabled={page <= 1 || requestsQuery.isFetching} onPress={() => setPage((value) => Math.max(value - 1, 1))}>
                Précédent
              </Button>
              <Button compact mode="outlined" disabled={page >= meta.totalPages || requestsQuery.isFetching} onPress={() => setPage((value) => value + 1)}>
                Suivant
              </Button>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {formOpen && enterpriseName ? (
        <OperationalRequestFormModal
          isOpen
          isEditing={false}
          enterpriseName={enterpriseName}
          initialValues={form}
          availableTypes={configuredTypes.filter((type) => type.isActive)}
          isSaving={createMutation.isPending}
          isLoadingTypes={typesQuery.isLoading}
          typesError={typesQuery.isError ? getErrorMessage(typesQuery.error) : null}
          errorMessage={formError}
          onClose={() => { if (!createMutation.isPending) setFormOpen(false); }}
          onRetryTypes={() => void typesQuery.refetch()}
          onSave={(payload) => createMutation.mutate(payload)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 14 },
  heading: { gap: 10, alignItems: 'flex-start' },
  headingText: { gap: 4, flex: 1 },
  createButton: { borderRadius: 9 },
  buttonContent: { minHeight: 44 },
  viewHeader: { gap: 2, marginTop: 2 },
  tabs: { gap: 8, paddingRight: 16 },
  tabButton: { borderRadius: 20 },
  loading: { marginTop: 20 },
  card: { borderRadius: 12 },
  cardContent: { gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, gap: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emptyContent: { gap: 12 },
  pagination: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  paginationActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
