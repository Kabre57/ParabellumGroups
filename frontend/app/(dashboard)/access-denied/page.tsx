'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';

export default function AccessDeniedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const permission = searchParams.get('permission');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-lg w-full text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldX className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Accès refusé</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette section.
        </p>
        {permission && (
          <div className="mt-4 text-xs text-gray-500">
            Permission requise : <span className="font-mono text-gray-700">{permission}</span>
          </div>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Retour
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
          >
            Tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
