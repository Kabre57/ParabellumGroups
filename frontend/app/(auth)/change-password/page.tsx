'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Saisissez le mot de passe provisoire.'),
  newPassword: z.string()
    .min(8, 'Au moins 8 caractères sont requis.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Ajoutez une majuscule, une minuscule et un chiffre.'),
  confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Les deux nouveaux mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
}).refine((values) => values.newPassword !== values.currentPassword, {
  message: 'Le nouveau mot de passe doit être différent du mot de passe provisoire.',
  path: ['newPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, changePassword, logout } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
    if (!isLoading && isAuthenticated && user && !user.mustChangePassword) router.replace('/dashboard');
  }, [isAuthenticated, isLoading, router, user]);

  const onSubmit = async (values: PasswordForm) => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      router.replace('/select-enterprise');
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Le changement du mot de passe a échoué. Réessayez.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated || !user?.mustChangePassword) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <img src="/parabellum.jpg" alt="Parabellum Groups" className="mx-auto mb-5 h-16 w-16 rounded-full object-cover" />
        <h1 className="text-center text-2xl font-bold text-gray-900">Sécurisez votre compte</h1>
        <p className="mt-3 text-sm text-gray-600">
          Ce compte utilise un mot de passe provisoire. Choisissez un nouveau mot de passe pour continuer vers votre espace.
        </p>

        {submitError && <div className="mt-5"><Alert variant="destructive">{submitError}</Alert></div>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium text-gray-700">Mot de passe provisoire</label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
            {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe</label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <p className="text-xs text-gray-500">8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.</p>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Mise à jour…' : 'Modifier le mot de passe'}
          </Button>
          <button type="button" onClick={() => void logout().then(() => router.replace('/login'))} className="w-full text-sm text-gray-600 hover:text-gray-900">
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
}
