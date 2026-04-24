'use client';

import React from 'react';
import type { Supplier } from '@/services/procurement';
import type { Enterprise } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DpaFormFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  enterpriseId: string;
  enterprises: Enterprise[];
  onEnterpriseChange: (value: string) => void;
  dateBesoin: string;
  onDateBesoinChange: (value: string) => void;
  supplierId: string;
  suppliers: Supplier[];
  onSupplierChange: (value: string) => void;
  manualSupplierName: string;
  onManualSupplierNameChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  disabled?: boolean;
}

export function DpaFormFields({
  title,
  onTitleChange,
  enterpriseId,
  enterprises,
  onEnterpriseChange,
  dateBesoin,
  onDateBesoinChange,
  supplierId,
  suppliers,
  onSupplierChange,
  manualSupplierName,
  onManualSupplierNameChange,
  notes,
  onNotesChange,
  description,
  onDescriptionChange,
  disabled = false,
}: DpaFormFieldsProps) {
  return (
    <div className="space-y-4 pb-2">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-medium">Objet</label>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Achat equipements reseau"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-medium">Entreprise</label>
          <select
            value={enterpriseId}
            onChange={(event) => onEnterpriseChange(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={disabled}
          >
            <option value="">
              {enterprises.length > 0 ? 'Selectionner une entreprise' : 'Aucune entreprise disponible'}
            </option>
            {enterprises.map((enterprise) => (
              <option key={String(enterprise.id)} value={String(enterprise.id)}>
                {enterprise.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-medium">Date de besoin</label>
          <Input
            type="date"
            value={dateBesoin}
            onChange={(event) => onDateBesoinChange(event.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-medium">Fournisseur existant</label>
          <select
            value={supplierId}
            onChange={(event) => onSupplierChange(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={disabled}
          >
            <option value="">Saisir un nouveau fournisseur ci-dessous</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 xl:col-span-2">
          <label className="text-sm font-medium">Nouveau fournisseur</label>
          <Input
            value={manualSupplierName}
            onChange={(event) => onManualSupplierNameChange(event.target.value)}
            placeholder="Nom fournisseur si absent de la liste"
            disabled={disabled || Boolean(supplierId)}
          />
        </div>

        <div className="space-y-2 xl:col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <Input
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Urgent / validation budgetaire"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="min-h-[76px] resize-none"
          placeholder="Contexte du besoin achat"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default DpaFormFields;
