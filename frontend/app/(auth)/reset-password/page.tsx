'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/shared/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const passwordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Au moins 8 caractères sont requis.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Ajoutez une majuscule, une minuscule et un chiffre.'),
  confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Les deux mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
    setIsReady(true);
  }, []);

  const onSubmit = async (values: PasswordForm) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, values.newPassword);
      setIsComplete(true);
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Le lien est invalide ou a expiré. Demandez un nouveau lien.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <img src="/parabellum.jpg" alt="Parabellum Groups" className="mx-auto mb-5 h-16 w-16 rounded-full object-cover" />
        {isComplete ? (
          <>
            <h1 className="text-center text-2xl font-bold text-gray-900">Mot de passe modifié</h1>
            <p className="mt-3 text-center text-sm text-gray-600">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <Button asChild className="mt-6 w-full"><Link href="/login">Retour à la connexion</Link></Button>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold text-gray-900">Créer un nouveau mot de passe</h1>
            <p className="mt-3 text-center text-sm text-gray-600">Le lien expire après 30 minutes et ne peut être utilisé qu’une seule fois.</p>
            {errorMessage && <div className="mt-5"><Alert variant="destructive">{errorMessage}</Alert></div>}
            {isReady && !token ? (
              <div className="mt-6 space-y-4">
                <Alert variant="destructive">Ce lien ne contient pas de jeton valide. Demandez un nouveau lien de réinitialisation.</Alert>
                <Button asChild variant="outline" className="w-full"><Link href="/forgot-password">Demander un nouveau lien</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
                <Button type="submit" className="w-full" disabled={!isReady || !token || isSubmitting}>
                  {isSubmitting ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
