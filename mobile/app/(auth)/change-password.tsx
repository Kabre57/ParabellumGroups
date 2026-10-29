import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { authService } from '@/api/auth';

const schema = z.object({
  currentPassword: z.string().min(1, 'Saisissez le mot de passe provisoire.'),
  newPassword: z.string()
    .min(8, 'Au moins 8 caractères sont requis.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Ajoutez une majuscule, une minuscule et un chiffre.'),
  confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Les deux nouveaux mots de passe ne correspondent pas.', path: ['confirmPassword'],
}).refine((values) => values.newPassword !== values.currentPassword, {
  message: 'Choisissez un mot de passe différent du mot de passe provisoire.', path: ['newPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordScreen(): JSX.Element {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: unknown }>(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : 'Le changement du mot de passe a échoué. Réessayez.';
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
          <Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>Sécurisez votre compte</Text>
          <Text variant="bodyMedium" style={styles.description}>
            Votre compte utilise un mot de passe provisoire. Choisissez-en un nouveau avant d’accéder à l’application.
          </Text>
          {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.form}>
            <PasswordField control={control} name="currentPassword" label="Mot de passe provisoire" autoComplete="current-password" />
            <PasswordField control={control} name="newPassword" label="Nouveau mot de passe" autoComplete="new-password" />
            <PasswordField control={control} name="confirmPassword" label="Confirmer le nouveau mot de passe" autoComplete="new-password" />
            <Text variant="bodySmall" style={styles.hint}>8 caractères minimum, avec une majuscule, une minuscule et un chiffre.</Text>
            <Button mode="contained" onPress={submit} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
              Modifier le mot de passe
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({ control, name, label, autoComplete }: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  autoComplete: 'current-password' | 'new-password';
}): JSX.Element {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
        <View>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            mode="outlined"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={autoComplete}
            textContentType={autoComplete}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={Boolean(fieldState.error)}
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />
          <HelperText type="error" visible={Boolean(fieldState.error)}>{fieldState.error?.message}</HelperText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#fff', padding: 24, borderRadius: 16, gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center' },
  title: { textAlign: 'center', color: '#111827', fontWeight: '700' },
  description: { color: '#64748b', textAlign: 'center' },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 },
  form: { gap: 8, marginTop: 8 },
  label: { color: '#334155', fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  inputOutline: { borderRadius: 8 },
  hint: { color: '#64748b' },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { minHeight: 48 },
});
