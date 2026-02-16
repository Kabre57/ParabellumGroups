'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const forgotPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      
      // Appel à l'API pour envoyer l'email de réinitialisation
      const rawBaseUrl =
        process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        '/api';
      const baseUrl = rawBaseUrl.replace(/\/$/, '');
      const baseWithApi = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

      const response = await fetch(`${baseWithApi}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email');
      }

      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé avec succès !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 transition-all duration-300 hover:shadow-2xl">
          
          {/* Logo + Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 flex flex-col items-center space-y-4">
              <img 
                src="/parabellum.jpg" 
                alt="Parabellum" 
                className="w-24 h-24 object-contain rounded-full border-4 border-white shadow-lg hover:scale-105 transition-transform duration-300"
              />
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  prarabellum groups
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Solution technique innovante
                </p>
              </div>
            </div>
            
            {!emailSent ? (
              <>
                <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
                  Mot de passe oublié ?
                </h2>
                <p className="text-center text-gray-600 mb-6 text-sm">
                  Entrez votre adresse email pour recevoir un lien de réinitialisation
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
                  Email envoyé !
                </h2>
                <p className="text-center text-gray-600 mb-6 text-sm">
                  Vérifiez votre boîte de réception pour réinitialiser votre mot de passe
                </p>
              </>
            )}
          </div>

          {!emailSent ? (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="group">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                    Adresse email
                  </label>
                  <div className="relative transition-all duration-300 group-hover:scale-[1.01]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      className="appearance-none block w-full px-12 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 ml-1 animate-fade-in">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>Envoyer le lien de réinitialisation</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-gray-600">
                Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou{' '}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  réessayez
                </button>
              </p>
            </div>
          )}

          {/* Retour à la connexion */}
          <div className="text-center text-sm mt-6">
            <Link
              href="/login"
              className="inline-flex items-center font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

