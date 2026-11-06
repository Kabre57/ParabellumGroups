'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { getPreferredServiceRoute } from '@/shared/dashboard-routing';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import type { Enterprise } from '@/shared/providers/EnterpriseProvider';
import { Building2, ChevronRight, Loader2, LogOut, ShieldCheck, RefreshCw } from 'lucide-react';

// Logos prédéfinis de haute qualité
const KNOWN_ENTERPRISE_LOGOS: Record<string, string> = {
  pbl: '/parabellum.jpg',
  pbls: '/parabellum.jpg',
  pgt: '/progiteck.jpg',
  progiteck: '/progiteck.jpg',
  parabellum: '/parabellum.jpg',
  soan: '/icon.svg',
};

function getFallbackLogo(enterprise: Enterprise): string | null {
  const code = (enterprise.code || '').toLowerCase().trim();
  const name = (enterprise.name || '').toLowerCase().trim();

  if (code && KNOWN_ENTERPRISE_LOGOS[code]) {
    return KNOWN_ENTERPRISE_LOGOS[code];
  }
  for (const [key, logo] of Object.entries(KNOWN_ENTERPRISE_LOGOS)) {
    if (name.includes(key)) {
      return logo;
    }
  }
  return null;
}

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
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const handleSelect = async (enterprise: Enterprise) => {
    setSelecting(String(enterprise.id));
    selectEnterprise(enterprise);
    await new Promise((r) => setTimeout(r, 250));
    const targetRoute = getPreferredServiceRoute(user);
    router.replace(targetRoute || '/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (authLoading || isLoadingEnterprises) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Chargement de votre espace</h2>
          <p className="text-slate-500 text-xs mt-1.5">Récupération des entreprises autorisées...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Branding Bar */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div
            style={{ width: '42px', height: '42px', minWidth: '42px', maxWidth: '42px' }}
            className="rounded-xl p-1 bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            <img
              src="/parabellum.jpg"
              alt="Parabellum Groups"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              className="rounded-lg"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">PARABELLUM GROUPS</h2>
            <p className="text-[11px] text-slate-500 font-medium">ERP &bull; Gestion multi-entreprises</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Session sécurisée</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-xl w-full mx-auto my-auto pt-8 pb-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sélectionnez votre entreprise
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            Bonjour <span className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</span>. Choisissez l'entité de travail pour ouvrir votre tableau de bord.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {enterpriseLoadError && (
            <div className="p-6 bg-red-50/70 border-b border-red-100 text-center">
              <p className="text-red-700 text-sm font-medium">{enterpriseLoadError}</p>
              <button
                type="button"
                onClick={() => void refreshEnterprises()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </button>
            </div>
          )}

          {enterprises.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Aucune entreprise rattachée</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                Votre compte n'a accès à aucune entité active. Veuillez contacter votre administrateur.
              </p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <span>Entités accessibles ({enterprises.length})</span>
                <span>Action</span>
              </div>

              <ul className="divide-y divide-slate-100">
                {enterprises.map((enterprise) => {
                  const isSelecting = selecting === String(enterprise.id);
                  const isCurrent = String(enterprise.id) === String(selectedEnterprise?.id);
                  const staticFallback = getFallbackLogo(enterprise);
                  const candidateLogo = (enterprise.logoUrl && !failedLogos[enterprise.logoUrl])
                    ? enterprise.logoUrl
                    : staticFallback;

                  return (
                    <li key={enterprise.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(enterprise)}
                        disabled={!!selecting}
                        aria-pressed={isCurrent}
                        className={`w-full flex items-center gap-4 p-4 text-left transition-all duration-150 group ${
                          isSelecting
                            ? 'bg-blue-50/80'
                            : isCurrent
                              ? 'bg-slate-50/60'
                              : 'hover:bg-slate-50'
                        } disabled:cursor-not-allowed`}
                      >
                        {/* Conteneur logo aux dimensions strictement verrouillées en inline style */}
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            minWidth: '56px',
                            maxWidth: '56px',
                            minHeight: '56px',
                            maxHeight: '56px',
                          }}
                          className="rounded-xl p-1 bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-blue-300 transition-colors"
                        >
                          {candidateLogo ? (
                            <img
                              src={candidateLogo}
                              alt={enterprise.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                display: 'block',
                              }}
                              className="rounded-lg"
                              onError={() => {
                                if (enterprise.logoUrl) {
                                  setFailedLogos((prev) => ({ ...prev, [enterprise.logoUrl!]: true }));
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-blue-600 transition-colors">
                              {enterprise.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Nom et métadonnées */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {enterprise.name}
                            </h3>
                            {isCurrent && !isSelecting && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                            {!enterprise.isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Flèche d'accès ou indicateur de sélection */}
                        <div className="flex-shrink-0 pl-2">
                          {isSelecting ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="hidden sm:inline">Connexion...</span>
                            </span>
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Se déconnecter
          </button>
        </div>
      </main>

      {/* Footer minimaliste pro */}
      <footer className="max-w-xl w-full mx-auto text-center pt-6 border-t border-slate-200 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Parabellum Groups. Tous droits réservés.
      </footer>
    </div>
  );
}
