'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import type { Enterprise } from '@/shared/providers/EnterpriseProvider';
import { Building2, ChevronRight, Loader2, LogOut, CheckCircle2 } from 'lucide-react';

export default function SelectEnterprisePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const {
    enterprises,
    selectedEnterprise,
    isLoadingEnterprises,
    enterpriseLoadError,
    selectEnterprise,
    refreshEnterprises,
  } = useEnterprise();
  const [selecting, setSelecting] = useState<string | null>(null);

  // Rediriger vers login si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const handleSelect = async (enterprise: Enterprise) => {
    setSelecting(String(enterprise.id));
    selectEnterprise(enterprise);
    // Petit délai pour l'animation
    await new Promise((r) => setTimeout(r, 300));
    router.replace('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (authLoading || isLoadingEnterprises) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-300" />
          <p className="text-blue-200 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <Building2 className="w-8 h-8 text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Sélectionnez votre entreprise
          </h1>
          <p className="text-blue-200 text-sm">
            Bonjour {user?.firstName} {user?.lastName} — choisissez l'entreprise dans laquelle vous souhaitez travailler
          </p>
        </div>

        {/* Enterprise list card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {enterpriseLoadError && (
            <div className="p-8 text-center">
              <p className="text-red-200 text-sm">{enterpriseLoadError}</p>
              <button
                type="button"
                onClick={() => void refreshEnterprises()}
                className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
              >
                Réessayer
              </button>
            </div>
          )}
          {enterprises.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-blue-300/50 mx-auto mb-3" />
              <p className="text-white/70 text-sm">Aucune entreprise accessible</p>
              <p className="text-white/40 text-xs mt-1">Contactez votre administrateur</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {enterprises.map((enterprise) => {
                const isSelecting = selecting === String(enterprise.id);
                const isCurrent = String(enterprise.id) === String(selectedEnterprise?.id);
                return (
                  <li key={enterprise.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(enterprise)}
                      disabled={!!selecting}
                      aria-pressed={isCurrent}
                      className={`w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all duration-200 group ${
                        isSelecting
                          ? 'bg-white/20'
                          : isCurrent
                            ? 'bg-white/10'
                          : 'hover:bg-white/10 active:bg-white/15'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {/* Logo / Initials */}
                      <div className="flex-shrink-0">
                        {enterprise.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={enterprise.logoUrl}
                            alt={enterprise.name}
                            className="w-12 h-12 rounded-xl object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center border border-white/20 shadow-inner">
                            <span className="text-white font-bold text-lg">
                              {enterprise.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate group-hover:text-blue-200 transition-colors">
                          {enterprise.name}
                        </p>
                        {enterprise.code && (
                          <p className="text-blue-300/70 text-xs mt-0.5">
                            Code : {enterprise.code}
                          </p>
                        )}
                        {isCurrent && !isSelecting && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-200 rounded-full border border-emerald-400/30">
                            Entreprise actuelle
                          </span>
                        )}
                        {!enterprise.isActive && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Arrow / Spinner */}
                      <div className="flex-shrink-0">
                        {isSelecting ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-300 animate-pulse" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Logout button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
