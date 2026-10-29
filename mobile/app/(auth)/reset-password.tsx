import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { authService } from '@/api/auth';

const schema = z.object({
  newPassword: z.string()
    .min(8, 'Au moins 8 caractères sont requis.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Ajoutez une majuscule, une minuscule et un chiffre.'),
  confirmPassword: z.string().min(1, 'Confirmez votre nouveau mot de passe.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Les deux mots de passe ne correspondent pas.', path: ['confirmPassword'],
});
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen(): JSX.Element {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const submit = handleSubmit(async ({ newPassword }) => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authService.resetPassword(token, newPassword);
      setIsComplete(true);
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: unknown }>(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : 'Impossible de réinitialiser le mot de passe. Demandez un nouveau lien et réessayez.';
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
          <Text variant="headlineSmall" accessibilityRole="header" style={styles.title}>
            {isComplete ? 'Mot de passe modifié' : 'Choisissez un nouveau mot de passe'}
          </Text>
          {isComplete ? (
            <>
              <Text variant="bodyMedium" style={styles.description}>Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.</Text>
              <Button mode="contained" onPress={() => router.replace('/login')} style={styles.button} contentStyle={styles.buttonContent}>
                Retour à la connexion
              </Button>
            </>
          ) : !token ? (
            <>
              <Text accessibilityRole="alert" style={styles.error}>Le lien de réinitialisation est incomplet ou invalide.</Text>
              <Button mode="contained" onPress={() => router.replace('/forgot-password')} style={styles.button} contentStyle={styles.buttonContent}>
                Demander un nouveau lien
              </Button>
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.description}>Le lien est valable 30 minutes et ne peut être utilisé qu’une seule fois.</Text>
              {errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage}</Text> : null}
              <View style={styles.form}>
                <PasswordField control={control} name="newPassword" label="Nouveau mot de passe" disabled={isSubmitting} />
                <PasswordField control={control} name="confirmPassword" label="Confirmer le nouveau mot de passe" disabled={isSubmitting} />
                <Text variant="bodySmall" style={styles.hint}>8 caractères minimum, avec une majuscule, une minuscule et un chiffre.</Text>
                <Button mode="contained" onPress={() => void submit()} loading={isSubmitting} disabled={isSubmitting} style={styles.button} contentStyle={styles.buttonContent}>
                  Réinitialiser le mot de passe
                </Button>
              </View>
            </>
          )}
          {!isComplete ? <Button mode="text" onPress={() => router.replace('/login')} textColor="#475569">Retour à la connexion</Button> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({ control, name, label, disabled }: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  disabled: boolean;
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
            autoComplete="new-password"
            textContentType="newPassword"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={Boolean(fieldState.error)}
            disabled={disabled}
            style={styles.input}
          />
          <HelperText type="error" visible={Boolean(fieldState.error)}>{fieldState.error?.message}</HelperText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#eef3ff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#fff', padding: 24, borderRadius: 16, gap: 12 },
  logo: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center' },
  title: { textAlign: 'center', color: '#111827', fontWeight: '700' },
  description: { color: '#475569', textAlign: 'center' },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8 },
  form: { gap: 8, marginTop: 8 },
  label: { color: '#334155', fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  hint: { color: '#64748b' },
  button: { marginTop: 8, borderRadius: 8 },
  buttonContent: { minHeight: 48 },
});
