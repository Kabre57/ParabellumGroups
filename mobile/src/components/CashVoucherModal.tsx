import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Modal, Portal, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { billingService, type CreateCashVoucherPayload } from '@/api/billing';
import { operationalRequestsService } from '@/api/operationalRequests';
import { formatMoney } from '@/constants/format';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';
import type { OperationalRequest } from '@/types/operationalRequest';

type CashVoucherModalProps = {
  isOpen: boolean;
  request: OperationalRequest;
  onClose: () => void;
  onSuccess: () => void;
};
type PaymentMethod = CreateCashVoucherPayload['paymentMethod'];
type ModalContentProps = CashVoucherModalProps & { userId: string | undefined; enterpriseId: number | null };
type CreateVariables = { paymentMethod: PaymentMethod; treasuryAccountId: string };

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'CARTE', label: 'Carte' },
];
const financialStatuses = ['APPROVED', 'IN_FINANCIAL_PROCESS'];
const getErrorMessage = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return error instanceof Error && error.message
    ? error.message : 'Impossible de créer et lier le bon de caisse. Réessayez.';
};
const getAmount = (request: OperationalRequest): number => {
  const amount = Number(request.amountApproved ?? request.amountRequested);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
    throw new Error('Le montant doit être positif et ne pas dépasser 999 999 999 999.');
  }
  return amount;
};

export function CashVoucherModal(props: CashVoucherModalProps): JSX.Element {
  const userId = useAuthStore((state) => state.user?.id);
  const enterpriseId = useEnterpriseStore((state) => state.activeEnterpriseId);
  return (
    <CashVoucherContent
      key={JSON.stringify([props.request.id, userId, enterpriseId, props.isOpen])}
      {...props}
      userId={userId}
      enterpriseId={enterpriseId}
    />
  );
}

function CashVoucherContent(props: ModalContentProps): JSX.Element {
  const { isOpen, request, userId, enterpriseId } = props;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const isCurrentContext = (): boolean => {
    const current = latest.current;
    return mounted.current && current.isOpen && Boolean(userId) &&
      useAuthStore.getState().user?.id === userId &&
      useEnterpriseStore.getState().activeEnterpriseId === enterpriseId &&
      current.request.id === request.id && current.request.enterpriseId === enterpriseId;
  };
  const assertAccess = (): void => {
    const rights = useAuthStore.getState().user?.permissions ?? [];
    if (!isCurrentContext() || !(rights.includes('*') || rights.includes('operational_requests.finance'))) {
      throw new Error('Votre session, votre entreprise ou vos permissions ont changé.');
    }
  };
  const assertFinancialRequest = (current: OperationalRequest): void => {
    assertAccess();
    if (current.id !== request.id || current.enterpriseId !== enterpriseId ||
        !financialStatuses.includes(current.status) || !financialStatuses.includes(latest.current.request.status)) {
      throw new Error('La demande ne permet plus de créer un bon de caisse. Actualisez le détail.');
    }
  };

  const accountsQuery = useQuery({
    queryKey: ['treasury-accounts', userId, enterpriseId],
    queryFn: async () => {
      assertAccess();
      const accounts = await billingService.getTreasuryAccounts();
      assertAccess();
      return accounts;
    },
    enabled: isOpen && Boolean(userId && enterpriseId && request.enterpriseId === enterpriseId),
  });
  const filteredAccounts = (accountsQuery.data ?? []).filter((account) =>
    account.isActive && account.type === (paymentMethod === 'ESPECES' ? 'CASH' : 'BANK'),
  );
  const selectedAccount = filteredAccounts.find((account) => account.id === treasuryAccountId);

  const mutation = useMutation({
    mutationFn: async (variables: CreateVariables) => {
      assertFinancialRequest(latest.current.request);
      const accounts = queryClient.getQueryData<Awaited<ReturnType<typeof billingService.getTreasuryAccounts>>>(
        ['treasury-accounts', userId, enterpriseId],
      );
      const selected = accounts?.find((account) => account.id === variables.treasuryAccountId &&
        account.isActive && account.type === (variables.paymentMethod === 'ESPECES' ? 'CASH' : 'BANK'));
      if (!selected) throw new Error('Sélectionnez un compte de trésorerie actif adapté au règlement.');

      const updated = await operationalRequestsService.createCashVoucher(request.id, {
        paymentMethod: variables.paymentMethod,
        treasuryAccountId: variables.treasuryAccountId,
      });
      assertAccess();
      return updated;
    },
    onSuccess: () => {
      if (!isCurrentContext()) return;
      useToastStore.getState().show('Bon de caisse créé et lié', 'success');
      latest.current.onSuccess();
      latest.current.onClose();
    },
    onError: (error: unknown) => {
      if (!isCurrentContext()) return;
      const message = getErrorMessage(error);
      setErrorMessage(message);
      useToastStore.getState().show(message, 'error');
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['operational-request', request.id] }),
        queryClient.invalidateQueries({ queryKey: ['operational-requests'] }),
      ]);
    },
    onSettled: () => { locked.current = false; },
  });

  const submit = (): void => {
    if (locked.current || mutation.isPending || !selectedAccount || accountsQuery.isFetching) return;
    try {
      assertFinancialRequest(request);
      getAmount(request);
      locked.current = true;
      setErrorMessage(null);
      mutation.mutate({ paymentMethod, treasuryAccountId });
    } catch (error: unknown) {
      if (!isCurrentContext()) return;
      const message = getErrorMessage(error);
      setErrorMessage(message);
      useToastStore.getState().show(message, 'error');
    }
  };
  const close = (): void => {
    if (!locked.current && !mutation.isPending) props.onClose();
  };

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={close}
        dismissable={!mutation.isPending}
        dismissableBackButton={!mutation.isPending}
        overlayAccessibilityLabel="Fermer la création du bon de caisse"
        style={styles.modal}
        contentContainerStyle={styles.container}
      >
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Text accessibilityRole="header" style={styles.title}>Créer un bon de caisse</Text>
            <Text style={styles.secondary}>Le bon sera lié à {request.requestNumber} et restera en brouillon dans Billing.</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Card mode="outlined" style={styles.card}>
              <Card.Content style={styles.summary}>
                <Text style={styles.label}>Bénéficiaire</Text>
                <Text style={styles.value}>{request.beneficiaryName}</Text>
                <Text style={styles.amount}>{formatMoney(request.amountApproved ?? request.amountRequested)}</Text>
              </Card.Content>
            </Card>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Mode de règlement</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SegmentedButtons<PaymentMethod>
                value={paymentMethod}
                onValueChange={(value) => {
                  if (locked.current || mutation.isPending) return;
                  setTreasuryAccountId('');
                  setPaymentMethod(value);
                }}
                buttons={paymentMethods.map((method) => ({
                  ...method,
                  disabled: mutation.isPending,
                  accessibilityLabel: `Règlement par ${method.label.toLowerCase()}`,
                  style: styles.segment,
                  labelStyle: styles.segmentLabel,
                }))}
              />
            </ScrollView>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Compte de trésorerie</Text>
            {accountsQuery.isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator accessibilityLabel="Chargement des comptes de trésorerie" />
                <Text style={styles.secondary}>Chargement des comptes…</Text>
              </View>
            ) : accountsQuery.isError ? (
              <View style={styles.summary}>
                <Text accessibilityRole="alert" style={styles.error}>{getErrorMessage(accountsQuery.error)}</Text>
                <Button mode="outlined" loading={accountsQuery.isFetching} disabled={accountsQuery.isFetching || mutation.isPending} onPress={() => void accountsQuery.refetch()} contentStyle={styles.buttonContent}>Réessayer</Button>
              </View>
            ) : filteredAccounts.length === 0 ? (
              <Text accessibilityRole="alert" style={styles.error}>Aucun compte disponible pour ce mode de règlement.</Text>
            ) : (
              <RadioButton.Group
                value={treasuryAccountId}
                onValueChange={(value) => { if (!locked.current && !mutation.isPending) setTreasuryAccountId(value); }}
              >
                {filteredAccounts.map((account) => (
                  <RadioButton.Item key={account.id} value={account.id} label={account.name} accessibilityLabel={`Compte ${account.name}`} disabled={mutation.isPending} color="#2563eb" style={styles.account} labelStyle={styles.accountLabel} />
                ))}
              </RadioButton.Group>
            )}
            {errorMessage ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Button mode="outlined" onPress={close} disabled={mutation.isPending} textColor="#334155" style={styles.outlinedButton} contentStyle={styles.buttonContent}>Annuler</Button>
            <Button mode="contained" onPress={submit} disabled={!selectedAccount || accountsQuery.isFetching || accountsQuery.isError || mutation.isPending} loading={mutation.isPending} buttonColor="#2563eb" textColor="#ffffff" style={styles.button} contentStyle={styles.buttonContent}>Créer et lier le bon</Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { marginTop: 0, marginBottom: 0, marginHorizontal: 0 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  secondary: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  content: { padding: 16, paddingTop: 0, gap: 16 },
  card: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 12 },
  summary: { gap: 8 },
  label: { fontSize: 12, color: '#64748b' },
  value: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  amount: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  segment: { minWidth: 120, minHeight: 44, flexGrow: 0, flexShrink: 0 },
  segmentLabel: { fontSize: 13 },
  account: { backgroundColor: '#ffffff', minHeight: 48 },
  accountLabel: { color: '#0f172a', fontSize: 14 },
  loading: { alignItems: 'center', gap: 8, padding: 16 },
  error: { color: '#e11d48', fontSize: 13, lineHeight: 20 },
  footer: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
  button: { borderRadius: 8 },
  outlinedButton: { borderRadius: 8, borderColor: '#e2e8f0' },
  buttonContent: { minHeight: 44 },
});
