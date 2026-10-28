'use client';

import { FormEvent, useState } from 'react';
import { Plus, Settings2, Trash2, X, Check, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OperationalRequestTypeConfig } from '@/shared/api/operationalRequests.service';

interface ManageRequestTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  types: OperationalRequestTypeConfig[];
  onCreateType: (data: { label: string; code?: string; description?: string }) => Promise<void>;
  onToggleActive: (type: OperationalRequestTypeConfig) => Promise<void>;
  onDeleteType: (id: string) => Promise<void>;
}

export function ManageRequestTypesModal({
  isOpen,
  onClose,
  types,
  onCreateType,
  onToggleActive,
  onDeleteType,
}: ManageRequestTypesModalProps) {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Le libellé est obligatoire.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onCreateType({
        label: label.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      setLabel('');
      setCode('');
      setDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Gestion des Types de Demande</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-medium text-slate-800">Ajouter un nouveau type</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Libellé affiché *</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Achats / Approvisionnement"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Code interne (facultatif)</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: PROCUREMENT"
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700">Description (facultatif)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Demandes de dépenses liées aux achats et commandes"
              className="mt-1"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter ce type
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-800">Types existants ({types.length})</h3>
          <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {types.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                Aucun type configuré. Utilisez le formulaire ci-dessus pour en ajouter.
              </div>
            ) : (
              types.map((typeConfig) => (
                <div key={typeConfig.id} className="flex items-center justify-between p-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{typeConfig.label}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                        {typeConfig.code}
                      </span>
                      {!typeConfig.isActive && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">
                          Désactivé
                        </span>
                      )}
                    </div>
                    {typeConfig.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{typeConfig.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(typeConfig)}
                      title={typeConfig.isActive ? 'Désactiver' : 'Activer'}
                      className={typeConfig.isActive ? 'text-slate-600' : 'text-emerald-600'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteType(typeConfig.id)}
                      title="Supprimer"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
