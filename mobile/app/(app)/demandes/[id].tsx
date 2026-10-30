import { isAxiosError } from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { operationalRequestsService, type CreatePayload } from '@/api/operationalRequests';
import { CashVoucherModal } from '@/components/CashVoucherModal';
import { OperationalRequestFormModal, type OperationalRequestFormValues } from '@/components/OperationalRequestFormModal';
import { formatMoney } from '@/constants/format';
import { attachmentStatuses, requestStatusLabels, requestTypeDetails, requestTypeLabels } from '@/constants/operationalRequests';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';
import type { OperationalRequest } from '@/types/operationalRequest';
import { hasExplicitPermission, hasPermission, isAdminRole } from '@/utils/permissions';

type ActionName = 'submit' | 'approve' | 'reject' | 'return' | 'sync' | 'close';
type ActionVariables = { action: ActionName; id: string; comment?: string };
type UploadFile = { uri: string; name: string; type: string };

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Une erreur est survenue. Vérifie la connexion puis réessaie.';
};

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const detailValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
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
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const enterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  const enterpriseName = useEnterpriseStore((state) => state.activeEnterpriseName);
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const isAdmin = isAdminRole(user);
  const canReadAll = isAdmin || hasExplicitPermission(user, 'operational_requests.read_all');
  const canCreate = isAdmin || hasPermission(user, 'operational_requests.create');
  const canUpdate = isAdmin || hasPermission(user, 'operational_requests.update');
  const canSubmit = isAdmin || hasPermission(user, 'operational_requests.submit');
  const canReview = !isAdmin && hasExplicitPermission(user, 'operational_requests.approve');
  const canReject = !isAdmin && hasExplicitPermission(user, 'operational_requests.reject');
  const canReturn = !isAdmin && hasExplicitPermission(user, 'operational_requests.return');
  const canReviewQueue = canReview || canReject || canReturn;
  const canFinance = hasExplicitPermission(user, 'operational_requests.finance');
  const canAttach = hasExplicitPermission(user, 'operational_requests.manage_attachments');

  const [decisionComment, setDecisionComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<OperationalRequestFormValues | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const requestQuery = useQuery({
    queryKey: ['mobile-operational-request', userId, enterpriseId, id],
    queryFn: () => operationalRequestsService.get(id!),
    enabled: Boolean(id && userId && enterpriseId !== null),
  });
  const request = requestQuery.data;
  const typesQuery = useQuery({
    queryKey: ['mobile-operational-request-types', enterpriseId],
    queryFn: () => operationalRequestsService.listTypes({ all: true }),
    enabled: Boolean(enterpriseId && (canCreate || canUpdate || canReadAll || canFinance)),
  });
  const configuredTypes = typesQuery.data ?? [];
  const typeLabel = request
    ? configuredTypes.find((item) => item.code === request.type)?.label ?? requestTypeLabels[request.type] ?? request.type
    : '';

  const refreshData = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mobile-operational-requests', userId, enterpriseId] }),
      id ? queryClient.invalidateQueries({ queryKey: ['mobile-operational-request', userId, enterpriseId, id] }) : Promise.resolve(),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async ({ action, id: requestId, comment }: ActionVariables): Promise<OperationalRequest> => {
      if (action === 'submit') return operationalRequestsService.submit(requestId, comment);
      if (action === 'approve' || action === 'reject' || action === 'return') {
        return operationalRequestsService.decide(requestId, action, comment ?? '');
      }
      if (action === 'sync') return operationalRequestsService.syncCashVoucher(requestId);
      if (action === 'close') return operationalRequestsService.close(requestId, comment);
      throw new Error('Action non prise en charge.');
    },
    onSuccess: async (updated, variables) => {
      setDecisionComment('');
      setActionError(null);
      if (variables.action === 'approve' || variables.action === 'reject' || variables.action === 'return') {
        useToastStore.getState().show('Décision enregistrée.', 'success');
        if (!canReadAll && !canFinance) {
          await queryClient.invalidateQueries({ queryKey: ['mobile-operational-requests', userId, enterpriseId] });
          router.back();
          return;
        }
      } else {
        useToastStore.getState().show('Demande mise à jour.', 'success');
      }
      queryClient.setQueryData(['mobile-operational-request', userId, enterpriseId, updated.id], updated);
      await refreshData();
    },
    onError: (error: unknown) => setActionError(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: CreatePayload }) => operationalRequestsService.update(requestId, payload),
    onSuccess: async (updated) => {
      setFormOpen(false);
      setFormError(null);
      queryClient.setQueryData(['mobile-operational-request', userId, enterpriseId, updated.id], updated);
      await refreshData();
      useToastStore.getState().show('Modifications enregistrées.', 'success');
    },
    onError: (error: unknown) => setFormError(getErrorMessage(error)),
  });

  const attachmentMutation = useMutation({
    mutationFn: ({ requestId, file }: { requestId: string; file: UploadFile }) => operationalRequestsService.uploadAttachment(requestId, file),
    onSuccess: async () => {
      await refreshData();
      useToastStore.getState().show('Pièce jointe ajoutée.', 'success');
    },
    onError: (error: unknown) => setActionError(getErrorMessage(error)),
  });

  const beginEdit = (current: OperationalRequest): void => {
    setFormValues({
      type: current.type,
      beneficiaryName: current.beneficiaryName,
      reason: current.reason,
      amountRequested: String(current.amountRequested),
      desiredDate: current.desiredDate ? new Date(current.desiredDate).toISOString().slice(0, 10) : '',
      details: Object.fromEntries(Object.entries(current.details ?? {}).map(([key, value]) => [key, detailValue(value)])),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const attachFile = async (current: OperationalRequest): Promise<void> => {
    setActionError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;
      if (file.size !== undefined && file.size > 8 * 1024 * 1024) {
        setActionError('Le fichier dépasse la limite de 8 Mo.');
        return;
      }
      const mimeType = file.mimeType || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      attachmentMutation.mutate({ requestId: current.id, file: { uri: file.uri, name: file.name, type: mimeType } });
    } catch (error: unknown) {
      setActionError(getErrorMessage(error));
    }
  };

  const submitAction = (action: ActionName, current: OperationalRequest): void => {
    if ((action === 'reject' || action === 'return') && !decisionComment.trim()) {
      setActionError('Ajoute un commentaire avant de rejeter ou de retourner la demande.');
      return;
    }
    setActionError(null);
    actionMutation.mutate({ action, id: current.id, comment: decisionComment.trim() || undefined });
  };

  const isOwner = Boolean(request && request.requesterId === userId);
  const canEditRequest = Boolean(request && isOwner && canUpdate && ['DRAFT', 'NEEDS_INFO'].includes(request.status));
  const canSubmitRequest = Boolean(request && isOwner && canSubmit && ['DRAFT', 'NEEDS_INFO'].includes(request.status));
  const canDecideRequest = Boolean(request && request.status === 'SUBMITTED' && canReviewQueue && !isOwner);
  const canUploadAttachment = Boolean(request && canAttach && attachmentStatuses.includes(request.status));
  const canPay = Boolean(request && canFinance && ['APPROVED', 'IN_FINANCIAL_PROCESS'].includes(request.status));

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={requestQuery.isRefetching} onRefresh={() => void requestQuery.refetch()} tintColor={colors.primary} />}
      >
        <Button mode="text" onPress={() => router.back()} style={styles.backButton}>‹  Retour à la liste</Button>
        {requestQuery.isPending ? <ActivityIndicator accessibilityLabel="Chargement de la demande" style={styles.loading} /> : null}
        {requestQuery.isError ? (
          <Card mode="outlined" style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{getErrorMessage(requestQuery.error)}</Text>
              <Button mode="contained" onPress={() => void requestQuery.refetch()}>Réessayer</Button>
              <Button mode="text" onPress={() => router.back()}>Retour à la liste</Button>
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
                    <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>{typeLabel}</Text>
                  </View>
                  <Chip compact>{requestStatusLabels[request.status] ?? request.status}</Chip>
                </View>
                <Divider />
                <Field label="Entreprise" value={request.enterpriseName || enterpriseName} />
                <Field label="Service" value={request.serviceName} />
                <Field label="Demandeur" value={request.requesterName} />
                <Field label="Bénéficiaire" value={request.beneficiaryName} />
                <Field label="Montant demandé" value={formatMoney(request.amountRequested, request.currency || 'XOF')} />
                {request.amountApproved !== null && request.amountApproved !== undefined ? (
                  <Field label="Montant approuvé" value={formatMoney(request.amountApproved, request.currency || 'XOF')} />
                ) : null}
                <Field label="Date souhaitée" value={formatDate(request.desiredDate)} />
                <Field label="Créée le" value={formatDate(request.createdAt)} />
                <Field label="Soumise le" value={formatDate(request.submittedAt)} />
                <Field label="Motif" value={request.reason} />
                {Object.entries(request.details ?? {}).filter(([, value]) => detailValue(value).trim()).length > 0 ? (
                  <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Détails</Text>
                    {Object.entries(request.details ?? {}).map(([key, value]) => {
                      const textValue = detailValue(value);
                      if (!textValue.trim()) return null;
                      const label = requestTypeDetails[request.type]?.find((field) => field.key === key)?.label ?? key;
                      return <Field key={key} label={label} value={textValue} />;
                    })}
                  </View>
                ) : null}
                {request.decisionComment ? (
                  <View style={styles.commentBox}>
                    <Text variant="labelLarge" style={styles.commentTitle}>Commentaire de décision</Text>
                    <Text style={styles.commentText}>{request.decisionComment}</Text>
                  </View>
                ) : null}
                {request.cashVoucherNumber ? (
                  <View style={styles.voucherBox}>
                    <Text variant="labelLarge" style={styles.voucherTitle}>Bon de caisse lié</Text>
                    <Text style={styles.value}>{request.cashVoucherNumber}</Text>
                  </View>
                ) : null}
              </Card.Content>
            </Card>

            {request.attachments?.length || canUploadAttachment ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.sectionHeading}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Pièces jointes</Text>
                    {canUploadAttachment ? (
                      <Button
                        mode="outlined"
                        icon="paperclip"
                        loading={attachmentMutation.isPending}
                        disabled={attachmentMutation.isPending}
                        onPress={() => void attachFile(request)}
                      >
                        Ajouter
                      </Button>
                    ) : null}
                  </View>
                  {request.attachments?.length ? request.attachments.map((attachment) => (
                    <View key={attachment.id} style={styles.attachment}>
                      <View style={styles.attachmentText}>
                        <Text variant="bodyMedium" style={styles.value}>{attachment.fileName}</Text>
                        <Text variant="bodySmall" style={styles.label}>
                          {(attachment.size / 1024 / 1024).toFixed(1)} Mo · {formatDate(attachment.createdAt)}
                        </Text>
                      </View>
                    </View>
                  )) : <Text style={styles.label}>Aucun justificatif ajouté.</Text>}
                  <Text variant="bodySmall" style={styles.label}>Formats acceptés : PDF, JPG ou PNG · 8 Mo maximum.</Text>
                </Card.Content>
              </Card>
            ) : null}

            {(request.approvalLogs ?? []).length > 0 ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Historique</Text>
                  {(request.approvalLogs ?? []).map((log) => (
                    <View key={log.id} style={styles.logItem}>
                      <Text variant="bodyMedium" style={styles.value}>
                        {log.actorName} · {requestStatusLabels[log.toStatus] ?? log.action.replaceAll('_', ' ')}
                      </Text>
                      <Text variant="bodySmall" style={styles.label}>{formatDate(log.createdAt)}</Text>
                      {log.comment ? <Text variant="bodyMedium" style={styles.secondary}>{log.comment}</Text> : null}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            ) : null}

            {canEditRequest || canSubmitRequest ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.actionCard}>
                  {canEditRequest ? (
                    <Button mode="outlined" icon="pencil" onPress={() => beginEdit(request)}>Modifier le brouillon</Button>
                  ) : null}
                  {canSubmitRequest ? (
                    <Button mode="contained" icon="send" loading={actionMutation.isPending && actionMutation.variables?.action === 'submit'} disabled={actionMutation.isPending} onPress={() => submitAction('submit', request)}>
                      Soumettre pour validation
                    </Button>
                  ) : null}
                </Card.Content>
              </Card>
            ) : null}

            {canDecideRequest ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.actionCard}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Décision</Text>
                  <TextInput
                    mode="outlined"
                    label="Commentaire (obligatoire pour un rejet ou un retour)"
                    value={decisionComment}
                    onChangeText={(value) => { setDecisionComment(value); setActionError(null); }}
                    multiline
                    numberOfLines={3}
                  />
                  {canReview ? (
                    <Button mode="contained" buttonColor="#15803d" loading={actionMutation.isPending && actionMutation.variables?.action === 'approve'} disabled={actionMutation.isPending} onPress={() => submitAction('approve', request)}>
                      Approuver
                    </Button>
                  ) : null}
                  {canReturn ? (
                    <Button mode="outlined" loading={actionMutation.isPending && actionMutation.variables?.action === 'return'} disabled={actionMutation.isPending || !decisionComment.trim()} onPress={() => submitAction('return', request)}>
                      Retourner pour complément
                    </Button>
                  ) : null}
                  {canReject ? (
                    <Button mode="outlined" textColor={colors.error} loading={actionMutation.isPending && actionMutation.variables?.action === 'reject'} disabled={actionMutation.isPending || !decisionComment.trim()} onPress={() => submitAction('reject', request)}>
                      Rejeter
                    </Button>
                  ) : null}
                </Card.Content>
              </Card>
            ) : null}

            {canPay ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.actionCard}>
                  <Text variant="bodyMedium" style={styles.secondary}>
                    Montant à régler : {formatMoney(request.amountApproved ?? request.amountRequested, request.currency || 'XOF')}
                  </Text>
                  <Button mode="contained" icon="cash" onPress={() => setPaymentOpen(true)}>Créer le bon de caisse</Button>
                </Card.Content>
              </Card>
            ) : null}

            {canFinance && ['CASH_VOUCHER_CREATED', 'DISBURSED'].includes(request.status) ? (
              <Card mode="outlined" style={styles.card}>
                <Card.Content style={styles.actionCard}>
                  <Button mode="outlined" icon="refresh" loading={actionMutation.isPending && actionMutation.variables?.action === 'sync'} disabled={actionMutation.isPending} onPress={() => submitAction('sync', request)}>
                    {request.status === 'DISBURSED' ? 'Vérifier le décaissement' : 'Vérifier le statut du bon'}
                  </Button>
                  {request.status === 'DISBURSED' ? (
                    <Button mode="contained" loading={actionMutation.isPending && actionMutation.variables?.action === 'close'} disabled={actionMutation.isPending} onPress={() => submitAction('close', request)}>
                      Clôturer le dossier
                    </Button>
                  ) : null}
                </Card.Content>
              </Card>
            ) : null}

            <HelperText type="error" visible={Boolean(actionError)} accessibilityRole="alert">{actionError}</HelperText>
          </>
        ) : null}
      </ScrollView>

      {formOpen && request && enterpriseName ? (
        <OperationalRequestFormModal
          isOpen
          isEditing
          enterpriseName={enterpriseName}
          initialValues={formValues ?? { type: '', beneficiaryName: '', reason: '', amountRequested: '', desiredDate: '', details: {} }}
          availableTypes={configuredTypes.filter((item) => item.isActive || item.code === request.type)}
          isSaving={updateMutation.isPending}
          isLoadingTypes={typesQuery.isLoading}
          typesError={typesQuery.isError ? getErrorMessage(typesQuery.error) : null}
          errorMessage={formError}
          onClose={() => { if (!updateMutation.isPending) setFormOpen(false); }}
          onRetryTypes={() => void typesQuery.refetch()}
          onSave={(payload) => updateMutation.mutate({ requestId: request.id, payload })}
        />
      ) : null}

      {request ? (
        <CashVoucherModal
          isOpen={paymentOpen}
          request={request}
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => { void refreshData(); }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  backButton: { alignSelf: 'flex-start', marginLeft: -8 },
  loading: { marginTop: 28 },
  card: { borderRadius: 12, backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  cardContent: { gap: 14 },
  actionCard: { gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headingText: { flex: 1, gap: 4 },
  field: { gap: 3 },
  label: { color: '#64748b' },
  value: { color: '#0f172a' },
  secondary: { color: '#64748b' },
  section: { gap: 10 },
  sectionTitle: { color: '#0f172a', fontWeight: '700' },
  commentBox: { backgroundColor: '#fff7ed', borderRadius: 8, padding: 12, gap: 4 },
  commentTitle: { color: '#9a3412' },
  commentText: { color: '#7c2d12' },
  voucherBox: { backgroundColor: '#eef2ff', borderRadius: 8, padding: 12, gap: 4 },
  voucherTitle: { color: '#4338ca' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  attachment: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  attachmentText: { flex: 1, gap: 3 },
  logItem: { gap: 4, borderLeftWidth: 2, borderLeftColor: '#cbd5e1', paddingLeft: 12, paddingVertical: 4 },
});
