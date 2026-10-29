import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { authService } from '@/api/auth';

const schema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').email('Adresse e-mail invalide.'),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen(): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const submit = handleSubmit(async ({ email }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authService.requestPasswordReset(email);
      setSubmitted(true);
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: unknown }>(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : 'Impossible de traiter la demande. Vérifiez votre connexion puis réessayez.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Image source={require('../../image/parabellum.jpg')} accessibilityLabel="Logo Parabellum Groups" style={styles.logo} />
          <Text variant="headlineSmall" accessibilityRole="header" style={styles.brand}>Parabellum Groups</Text>
          <Text variant="bodyMedium" style={styles.tagline}>Solution technique innovante</Text>

          {submitted ? (
            <View style={styles.messageBlock}>
              <Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>Demande prise en compte</Text>
              <Text variant="bodyMedium" style={styles.description}>
                Si cette adresse est liée à un compte, un lien de réinitialisation sera envoyé. Il expire après 30 minutes.
              </Text>
              <Text variant="bodySmall" style={styles.hint}>
                Vérifiez aussi votre dossier spam. Si rien n’arrive après quelques minutes, contactez votre administrateur.
              </Text>
              <Button mode="text" onPress={() => setSubmitted(false)}>Réessayer</Button>
            </View>
          ) : (
            <>
              <Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>Mot de passe oublié ?</Text>
              <Text variant="bodyMedium" style={styles.description}>
                Entrez votre adresse e-mail pour demander un lien de réinitialisation.
              </Text>
              {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
                    <View>
                      <Text style={styles.label}>Adresse e-mail</Text>
                      <TextInput
                        ref={ref}
                        accessibilityLabel="Adresse e-mail"
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={Boolean(fieldState.error)}
                        disabled={isSubmitting}
                        style={styles.input}
                      />
                      <HelperText type="error" visible={Boolean(fieldState.error)}>{fieldState.error?.message}</HelperText>
                    </View>
                  )}
                />
                <Button mode="contained" onPress={() => void submit()} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
                  Envoyer le lien de réinitialisation
                </Button>
              </View>
            </>
          )}

          <Button mode="text" onPress={() => router.replace('/login')} textColor="#475569">
            ← Retour à la connexion
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef3ff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#fff', padding: 24, borderRadius: 16, gap: 12 },
  logo: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center' },
  brand: { textAlign: 'center', color: '#315cf5', fontWeight: '700' },
  tagline: { textAlign: 'center', color: '#64748b', marginTop: -10 },
  title: { textAlign: 'center', color: '#111827', fontWeight: '700', marginTop: 12 },
  description: { textAlign: 'center', color: '#475569' },
  messageBlock: { gap: 12, marginVertical: 12 },
  hint: { color: '#64748b', textAlign: 'center', marginTop: 12 },
  form: { gap: 8, marginTop: 12 },
  label: { color: '#334155', fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { minHeight: 48 },
});
