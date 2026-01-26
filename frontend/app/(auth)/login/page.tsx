'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-6">
      {/* Section Logo + Titre - MODIFIÉE */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img 
            src="/parabellum.jpg" 
            alt="Parabellum Groups" 
            className="w-20 h-20 object-contain rounded-full border-4 border-white shadow-lg"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Connectez-vous à votre compte Parabellum ERP
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Le reste du formulaire reste inchangé */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ... Champ email ... */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    autoComplete="email"
                    {...register('email')}
                    className={`pl-10 transition-all duration-200 ${
                      errors.email 
                        ? 'border-red-500 focus-visible:ring-red-500' 
                        : 'focus:border-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:focus:border-blue-500'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 animate-fade-in">
                    {errors.email.message}
                  </p>
                )}
              </div>

      {/* Champ mot de passe avec icône et toggle */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`pl-10 pr-12 transition-all duration-200 ${
                      errors.password 
                        ? 'border-red-500 focus-visible:ring-red-500' 
                        : 'focus:border-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 animate-fade-in">
                    {errors.password.message}
                  </p>
                )}
              </div>

        {/* ... Bouton de connexion ... */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>

      {/* ... Lien d'inscription ... */}
      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Pas encore de compte ?{' '}
        </span>
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-dark"
        >
          S'inscrire
        </Link>
      </div>
    </div>
  );
}