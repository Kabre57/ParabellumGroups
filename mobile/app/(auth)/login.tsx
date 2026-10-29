import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState, type JSX } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { authService } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore } from '@/stores/enterpriseStore';
import { useToastStore } from '@/stores/toastStore';

const COLORS = {
  primary: '#5B21B6',
  background: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  inputBg: '#F9FAFB',
  inputBorder: '#E5E7EB',
  error: '#EF4444',
};

const loginSchema = z.object({
  email: z.string().trim().min(1, 'L’adresse e-mail est requise.').email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Le mot de passe est requis.').min(6, 'Au moins 6 caractères sont requis.'),
});

type LoginValues = z.infer<typeof loginSchema>;

const getLoginError = (error: unknown): string => {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Connexion impossible. Vérifiez votre connexion puis réessayez.';
  }
  if (error instanceof Error && error.message === 'Aucune entreprise accessible') {
    return error.message;
  }
  return 'Impossible de vous connecter. Réessayez.';
};

export default function LoginScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const password = useWatch({ control, name: 'password', defaultValue: '' });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: async (response) => {
      if (response.user.mustChangePassword) {
        await SecureStore.setItemAsync('access_token', response.accessToken);
        useAuthStore.getState().setUser(response.user);
        router.replace('/change-password');
        return;
      }
      if (response.enterprises.length === 0) throw new Error('Aucune entreprise accessible');

      await SecureStore.setItemAsync('access_token', response.accessToken);
      await queryClient.cancelQueries();
      queryClient.removeQueries();
      const enterpriseStore = useEnterpriseStore.getState();
      enterpriseStore.clear();
      enterpriseStore.setEnterprises(response.enterprises);
      const onlyEnterprise = response.enterprises[0];
      if (response.enterprises.length === 1 && onlyEnterprise) enterpriseStore.setActive(onlyEnterprise);
      useAuthStore.getState().setUser(response.user);
      router.replace(response.enterprises.length === 1 ? '/' : '/selection-entreprise');
    },
    onError: async (error: unknown) => {
      try {
        await SecureStore.deleteItemAsync('access_token');
      } catch {
        // Conserver le message d'erreur même si SecureStore est indisponible.
      }
      useAuthStore.getState().logout();
      queryClient.removeQueries();
      const message = getLoginError(error);
      setFormError(message);
      useToastStore.getState().show(message, 'error');
    },
  });

  const submit = handleSubmit((values) => {
    if (login.isPending) return;
    setFormError(null);
    login.mutate(values);
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../image/parabellum.jpg')}
              accessibilityLabel="Logo Parabellum Groups"
              resizeMode="cover"
              style={styles.logo}
            />
          </View>
          <Text variant="headlineMedium" accessibilityRole="header" style={styles.brandTitle}>
            Parabellum Groups
          </Text>
          <Text variant="bodyMedium" style={styles.brandSubtitle}>
            Solution technique innovante
          </Text>
        </View>

        <View style={styles.formHeader}>
          <Text variant="titleLarge" style={styles.formTitle}>Connexion à votre espace</Text>
          <Text variant="bodySmall" style={styles.formSubtitle}>
            Entrez vos identifiants pour accéder au tableau de bord
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresse e-mail</Text>
                <TextInput
                  ref={ref}
                  placeholder="email@example.com"
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel="Adresse e-mail"
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={Boolean(fieldState.error)}
                  disabled={login.isPending}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="email-outline" color="#9CA3AF" />}
                />
                <HelperText type="error" visible={Boolean(fieldState.error)}>
                  {fieldState.error?.message}
                </HelperText>
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  ref={ref}
                  placeholder="Mot de passe"
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel="Mot de passe"
                  mode="outlined"
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={Boolean(fieldState.error)}
                  disabled={login.isPending}
                  onSubmitEditing={() => void submit()}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  left={<TextInput.Icon icon="lock-outline" color="#9CA3AF" />}
                  right={(
                    <TextInput.Icon
                      icon={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setIsPasswordVisible((visible) => !visible)}
                      color="#9CA3AF"
                      accessibilityLabel={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    />
                  )}
                />
                <HelperText type="error" visible={Boolean(fieldState.error)}>
                  {fieldState.error?.message}
                </HelperText>
              </View>
            )}
          />

          {formError ? (
            <Text variant="bodySmall" accessibilityRole="alert" style={styles.error}>{formError}</Text>
          ) : null}

          <Button
            mode="contained"
            loading={login.isPending}
            disabled={login.isPending || !email.trim() || !password}
            onPress={() => void submit()}
            contentStyle={styles.buttonContent}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Se connecter
          </Button>
          {formError ? (
            <Button
              mode="text"
              disabled={login.isPending || !email.trim() || !password}
              onPress={() => void submit()}
              textColor={COLORS.primary}
            >
              Réessayer
            </Button>
          ) : null}

          <Button
            mode="text"
            onPress={() => useToastStore.getState().show('La récupération du mot de passe n’est pas encore disponible. Contactez votre administrateur.', 'info')}
            textColor={COLORS.primary}
            style={styles.forgotButton}
            labelStyle={styles.forgotLabel}
          >
            Mot de passe oublié ?
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 84,
    height: 84,
    marginBottom: 16,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: { width: '100%', height: '100%' },
  brandTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 26, marginBottom: 4 },
  brandSubtitle: { color: COLORS.textSecondary, fontSize: 14 },
  formHeader: { alignItems: 'center', marginBottom: 24 },
  formTitle: { fontWeight: 'bold', color: COLORS.text, fontSize: 22, marginBottom: 8, textAlign: 'center' },
  formSubtitle: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 14 },
  form: { gap: 12 },
  inputGroup: { marginBottom: -8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { backgroundColor: COLORS.inputBg, height: 52, fontSize: 15 },
  inputOutline: { borderRadius: 10, borderColor: COLORS.inputBorder },
  error: { color: COLORS.error, textAlign: 'center', marginTop: -8, marginBottom: 8 },
  button: { borderRadius: 10, marginTop: 8, backgroundColor: COLORS.primary },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  forgotButton: { marginTop: 4 },
  forgotLabel: { fontSize: 14, fontWeight: '500' },
});
