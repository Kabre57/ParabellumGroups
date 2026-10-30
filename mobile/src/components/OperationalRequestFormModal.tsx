import { useEffect, useState, type JSX } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, HelperText, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CreatePayload } from '@/api/operationalRequests';
import { requestTypeDetails } from '@/constants/operationalRequests';
import type { OperationalRequestTypeConfig } from '@/types/operationalRequest';

export type OperationalRequestFormValues = {
  type: string;
  beneficiaryName: string;
  reason: string;
  amountRequested: string;
  desiredDate: string;
  details: Record<string, string>;
};

type Props = {
  isOpen: boolean;
  isEditing: boolean;
  enterpriseName: string;
  initialValues: OperationalRequestFormValues;
  availableTypes: OperationalRequestTypeConfig[];
  isSaving: boolean;
  isLoadingTypes?: boolean;
  typesError?: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onRetryTypes?: () => void;
  onSave: (payload: CreatePayload) => void;
};

const emptyValues = (): OperationalRequestFormValues => ({
  type: '',
  beneficiaryName: '',
  reason: '',
  amountRequested: '',
  desiredDate: '',
  details: {},
});

export function OperationalRequestFormModal(props: Props): JSX.Element | null {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(props.initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (props.isOpen) {
      setForm(props.initialValues);
      setValidationError(null);
    }
  }, [props.initialValues, props.isOpen]);

  if (!props.isOpen) return null;

  const selectedType = props.availableTypes.find((item) => item.code === form.type);
  const fields = requestTypeDetails[form.type] ?? [];
  const change = <K extends keyof OperationalRequestFormValues>(key: K, value: OperationalRequestFormValues[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const submit = (): void => {
    const amount = Number(form.amountRequested.replace(',', '.'));
    if (!form.type || !props.availableTypes.some((item) => item.code === form.type)) {
      setValidationError('Sélectionnez un type de demande actif.');
      return;
    }
    if (!form.beneficiaryName.trim() || !form.reason.trim() || !Number.isFinite(amount) || amount <= 0) {
      setValidationError('Renseignez le bénéficiaire, le motif et un montant supérieur à zéro.');
      return;
    }
    if (form.desiredDate && Number.isNaN(new Date(form.desiredDate).getTime())) {
      setValidationError('La date souhaitée est invalide. Utilisez le format AAAA-MM-JJ.');
      return;
    }
    const details = Object.fromEntries(
      Object.entries(form.details).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value),
    );
    props.onSave({
      type: form.type,
      beneficiaryName: form.beneficiaryName.trim(),
      reason: form.reason.trim(),
      amountRequested: amount,
      ...(form.desiredDate ? { desiredDate: form.desiredDate } : {}),
      details,
    });
  };

  return (
    <Portal>
      <Modal
        visible={props.isOpen}
        onDismiss={props.isSaving ? undefined : props.onClose}
        dismissable={!props.isSaving}
        dismissableBackButton={!props.isSaving}
        overlayAccessibilityLabel="Fermer le formulaire de demande"
        style={styles.modal}
        contentContainerStyle={styles.container}
      >
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>
              {props.isEditing ? 'Modifier la demande' : 'Nouvelle demande'}
            </Text>
            <Text style={styles.secondary}>Entreprise : {props.enterpriseName} · Devise XOF</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Type de demande</Text>
            {props.isLoadingTypes ? (
              <View style={styles.typeLoading}>
                <ActivityIndicator size="small" />
                <Text style={styles.secondary}>Chargement des types…</Text>
              </View>
            ) : props.typesError ? (
              <View style={styles.typeLoading}>
                <Text accessibilityRole="alert" style={styles.warning}>{props.typesError}</Text>
                {props.onRetryTypes ? <Button mode="outlined" onPress={props.onRetryTypes}>Réessayer</Button> : null}
              </View>
            ) : props.availableTypes.length > 0 ? (
              <View style={styles.chips}>
                {props.availableTypes.map((item) => (
                  <Chip
                    key={item.id}
                    selected={item.code === form.type}
                    onPress={() => {
                      setForm((current) => ({ ...current, type: item.code, details: {} }));
                      setValidationError(null);
                    }}
                    showSelectedCheck
                    disabled={props.isSaving}
                  >
                    {item.label}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.warning}>Aucun type de demande actif n’est configuré pour cette entreprise.</Text>
            )}
            {selectedType?.description ? <Text style={styles.secondary}>{selectedType.description}</Text> : null}

            <TextInput
              mode="outlined"
              label="Bénéficiaire"
              accessibilityLabel="Bénéficiaire"
              value={form.beneficiaryName}
              onChangeText={(value) => change('beneficiaryName', value)}
              disabled={props.isSaving}
              autoCapitalize="words"
            />
            <TextInput
              mode="outlined"
              label="Montant estimé (XOF)"
              accessibilityLabel="Montant estimé en XOF"
              value={form.amountRequested}
              onChangeText={(value) => change('amountRequested', value)}
              disabled={props.isSaving}
              keyboardType="decimal-pad"
            />
            <TextInput
              mode="outlined"
              label="Motif"
              accessibilityLabel="Motif de la demande"
              value={form.reason}
              onChangeText={(value) => change('reason', value)}
              disabled={props.isSaving}
              multiline
              numberOfLines={4}
              style={styles.multiline}
            />
            <TextInput
              mode="outlined"
              label="Date souhaitée (AAAA-MM-JJ)"
              accessibilityLabel="Date souhaitée au format année mois jour"
              value={form.desiredDate}
              onChangeText={(value) => change('desiredDate', value)}
              disabled={props.isSaving}
              placeholder="2026-10-30"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />

            {fields.map((field) => (
              <TextInput
                key={field.key}
                mode="outlined"
                label={field.label}
                accessibilityLabel={field.label}
                value={form.details[field.key] ?? ''}
                onChangeText={(value) => setForm((current) => ({
                  ...current,
                  details: { ...current.details, [field.key]: value },
                }))}
                disabled={props.isSaving}
              />
            ))}

            <HelperText type="error" visible={Boolean(validationError || props.errorMessage)} accessibilityRole="alert">
              {validationError || props.errorMessage}
            </HelperText>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Button mode="outlined" onPress={props.onClose} disabled={props.isSaving} style={styles.actionButton}>
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={submit}
              loading={props.isSaving}
              disabled={props.isSaving || props.isLoadingTypes || Boolean(props.typesError) || props.availableTypes.length === 0}
              style={styles.actionButton}
            >
              {props.isEditing ? 'Enregistrer' : 'Créer le brouillon'}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

export const newOperationalRequestForm = emptyValues;

const styles = StyleSheet.create({
  modal: { margin: 0 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  title: { color: '#0f172a', fontWeight: '700' },
  secondary: { color: '#64748b', lineHeight: 20 },
  content: { padding: 16, gap: 12 },
  sectionTitle: { color: '#0f172a', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeLoading: { alignItems: 'flex-start', gap: 8 },
  warning: { color: '#a16207' },
  multiline: { minHeight: 110 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
  actionButton: { flex: 1 },
});
