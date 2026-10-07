'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Loader2, ArrowLeftRight } from 'lucide-react';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';

export const EnterpriseSwitcher: React.FC = () => {
  const router = useRouter();
  const {
    selectedEnterprise,
    enterprises,
    isLoadingEnterprises,
    enterpriseLoadError,
    selectEnterprise,
    refreshEnterprises,
  } = useEnterprise();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoadingEnterprises) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement...</span>
      </div>
    );
  }

  if (enterpriseLoadError) {
    if (selectedEnterprise) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700" title={enterpriseLoadError}>
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium truncate max-w-[140px]">{selectedEnterprise.name}</span>
          <button
            type="button"
            onClick={() => void refreshEnterprises()}
            className="underline underline-offset-2"
            aria-label="Recharger la liste des entreprises"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void refreshEnterprises()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
      >
        <Building2 className="w-4 h-4" />
        <span>Recharger les entreprises</span>
      </button>
    );
  }

  // A single accessible enterprise is shown as the active company; there is
  // no alternate destination to switch to.
  if (enterprises.length <= 1 && selectedEnterprise) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
        <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="font-medium truncate max-w-[140px]">{selectedEnterprise.name}</span>
      </div>
    );
  }

  if (!selectedEnterprise) {
    return (
      <button
        type="button"
        onClick={() => router.push('/select-enterprise')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
      >
        <ArrowLeftRight className="w-4 h-4" />
        <span>Sélectionner une entreprise</span>
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label={`Entreprise active : ${selectedEnterprise.name}. Changer d'entreprise`}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors max-w-[220px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedEnterprise.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedEnterprise.logoUrl}
            alt={selectedEnterprise.name}
            className="w-5 h-5 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold leading-none">
              {selectedEnterprise.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="font-medium truncate">{selectedEnterprise.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
            Changer d'entreprise
          </div>
          <ul className="py-1 max-h-64 overflow-y-auto">
            {enterprises.map((enterprise) => {
              const isSelected = String(enterprise.id) === String(selectedEnterprise.id);
              return (
                <li key={enterprise.id}>
                  <button
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => {
                      selectEnterprise(enterprise);
                      setIsOpen(false);
                      // Recharger la page courante avec la nouvelle entreprise
                      window.location.reload();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {enterprise.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={enterprise.logoUrl}
                        alt={enterprise.name}
                        className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold leading-none">
                          {enterprise.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="flex-1 truncate font-medium">{enterprise.name}</span>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-blue-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
