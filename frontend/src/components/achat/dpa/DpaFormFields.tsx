'use client';

import React from 'react';
import type { Service } from '@/shared/api/admin';
import type { Supplier } from '@/services/procurement';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DpaFormFieldsProps {
  showServiceSelector: boolean;
  selectedServiceId: string;
  services: Service[];
  onServiceChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
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
  servicePlaceholder?: string;
  disabled?: boolean;
}

export function DpaFormFields({
  showServiceSelector,
  selectedServiceId,
  services,
  onServiceChange,
  title,
  onTitleChange,
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
  servicePlaceholder = 'Sélectionner un service associé',
  disabled = false,
}: DpaFormFieldsProps) {
  const hasServices = services.length > 0;

  return (
    <div className="space-y-4 pb-2">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {showServiceSelector ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Service interne associé</label>
            <select
              value={selectedServiceId}
              onChange={(event) => onServiceChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled || (!hasServices && !selectedServiceId)}
            >
              <option value="">
                {hasServices ? servicePlaceholder : 'Aucun service disponible pour cette entreprise'}
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {!hasServices ? (
              <p className="text-xs text-muted-foreground">
                La liste des services renvoyee par l&apos;API est vide pour l&apos;entreprise rattachee a ce compte.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 xl:col-span-1">
          <label className="text-sm font-medium">Objet</label>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Achat équipements réseau"
            disabled={disabled}
          />
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
