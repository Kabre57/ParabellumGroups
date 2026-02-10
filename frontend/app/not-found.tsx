'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-xl p-10 max-w-md w-full text-center border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page introuvable</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Nous n'avons pas pu trouver la ressource demandée. Vérifiez l'URL ou revenez au tableau de bord.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Se reconnecter</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
