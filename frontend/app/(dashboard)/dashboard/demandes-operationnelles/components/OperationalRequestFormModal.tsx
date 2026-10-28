'use client';

import { FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { OperationalRequestType, OperationalRequestTypeConfig } from '@/shared/api/operationalRequests.service';
import { typeDetails } from '../constants';
import type { FormValues } from '../types';

interface OperationalRequestFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  enterpriseName: string;
  form: FormValues;
  error: string;
  isSaving: boolean;
  availableTypes?: OperationalRequestTypeConfig[];
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onChange: (updater: (prev: FormValues) => FormValues) => void;
  onTypeChange: (type: OperationalRequestType) => void;
}

export function OperationalRequestFormModal({
  isOpen,
  isEditing,
  enterpriseName,
  form,
  error,
  isSaving,
  availableTypes = [],
  onClose,
  onSubmit,
  onChange,
  onTypeChange,
}: OperationalRequestFormModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-form-title"
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto my-3 max-h-[calc(100vh-24px)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:my-8 sm:max-h-[calc(100vh-64px)] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="request-form-title" className="text-xl font-bold text-slate-950">
              {isEditing ? 'Modifier la demande' : 'Nouvelle demande'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Entreprise active : {enterpriseName} · Devise XOF
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-800">
            Type de demande
            <select
              value={form.type}
              onChange={(event) => onTypeChange(event.target.value as OperationalRequestType)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              required
            >
              <option value="" disabled>
                {availableTypes.length === 0
                  ? 'Aucun type configuré (veuillez contacter un administrateur)'
                  : 'Sélectionnez un type de demande...'}
              </option>
              {availableTypes.map((typeConfig) => (
                <option key={typeConfig.id} value={typeConfig.code}>
                  {typeConfig.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">
              Bénéficiaire
              <Input
                value={form.beneficiaryName}
                onChange={(event) =>
                  onChange((current) => ({ ...current, beneficiaryName: event.target.value }))
                }
                className="mt-1 min-h-11"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Montant estimé (XOF)
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.amountRequested}
                onChange={(event) =>
                  onChange((current) => ({ ...current, amountRequested: event.target.value }))
                }
                className="mt-1 min-h-11"
                required
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-800">
            Motif
            <Textarea
              value={form.reason}
              onChange={(event) =>
                onChange((current) => ({ ...current, reason: event.target.value }))
              }
              className="mt-1 min-h-24"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Date souhaitée
            <Input
              type="date"
              value={form.desiredDate}
              onChange={(event) =>
                onChange((current) => ({ ...current, desiredDate: event.target.value }))
              }
              className="mt-1 min-h-11"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {typeDetails[form.type].map((field) => (
              <label key={field.key} className="block text-sm font-medium text-slate-800">
                {field.label}
                <Input
                  value={form.details[field.key] || ''}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      details: { ...current.details, [field.key]: event.target.value },
                    }))
                  }
                  className="mt-1 min-h-11"
                />
              </label>
            ))}
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="min-h-11" disabled={isSaving}>
              {isSaving
                ? 'Enregistrement…'
                : isEditing
                  ? 'Enregistrer les modifications'
                  : 'Enregistrer le brouillon'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
