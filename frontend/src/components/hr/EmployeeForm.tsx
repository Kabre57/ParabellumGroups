'use client';

import type React from 'react';
import { Input } from '@/components/ui/input';

type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  nationality: string;
  cnpsNumber: string;
  cnamNumber: string;
  position: string;
  department: string;
  hireDate: string;
  salary: string;
  matricule: string;
  isActive: boolean;
};

type EmployeeFormProps = {
  form: EmployeeFormValues;
  onChange: (field: keyof EmployeeFormValues, value: string | boolean) => void;
  matriculeHint?: string;
  className?: string;
  matriculeReadOnly?: boolean;
  matriculePlaceholder?: string;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export function EmployeeForm({
  form,
  onChange,
  matriculeHint = 'Matricule',
  className,
  matriculeReadOnly = false,
  matriculePlaceholder = 'Code employé',
}: EmployeeFormProps) {
  return (
    <div className={className ?? 'grid grid-cols-1 gap-4 md:grid-cols-2'}>
      <Field label="Nom">
        <Input value={form.lastName} onChange={(event) => onChange('lastName', event.target.value)} placeholder="Nom de famille" />
      </Field>

      <Field label="Prénom">
        <Input value={form.firstName} onChange={(event) => onChange('firstName', event.target.value)} placeholder="Prénom" />
      </Field>

      <Field label="Email">
        <Input type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="email@entreprise.com" />
      </Field>

      <Field label="Téléphone">
        <Input value={form.phoneNumber} onChange={(event) => onChange('phoneNumber', event.target.value)} placeholder="Numéro de téléphone" />
      </Field>

      <Field label="Poste">
        <Input value={form.position} onChange={(event) => onChange('position', event.target.value)} placeholder="Fonction occupée" />
      </Field>

      <Field label="Département">
        <Input value={form.department} onChange={(event) => onChange('department', event.target.value)} placeholder="Service ou département" />
      </Field>

      <Field label="Salaire mensuel (FCFA)">
        <Input
          type="number"
          min={1}
          value={form.salary}
          onChange={(event) => onChange('salary', event.target.value)}
          placeholder="Salaire de base"
        />
      </Field>

      <Field label={matriculeHint}>
        <Input
          value={form.matricule}
          onChange={(event) => onChange('matricule', event.target.value)}
          placeholder={matriculePlaceholder}
          readOnly={matriculeReadOnly}
          disabled={matriculeReadOnly}
        />
      </Field>

      <Field label="Adresse">
        <Input value={form.address} onChange={(event) => onChange('address', event.target.value)} placeholder="Adresse de résidence" />
      </Field>

      <Field label="Nationalité">
        <Input value={form.nationality} onChange={(event) => onChange('nationality', event.target.value)} placeholder="Nationalité" />
      </Field>

      <Field label="Numéro CNPS">
        <Input value={form.cnpsNumber} onChange={(event) => onChange('cnpsNumber', event.target.value)} placeholder="Numéro CNPS" />
      </Field>

      <Field label="Numéro CNAM / CMU">
        <Input value={form.cnamNumber} onChange={(event) => onChange('cnamNumber', event.target.value)} placeholder="Numéro CNAM ou CMU" />
      </Field>

      <div className="md:col-span-2">
        <Field label="Date d'embauche">
          <Input type="date" value={form.hireDate} onChange={(event) => onChange('hireDate', event.target.value)} />
        </Field>
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center gap-3 rounded-md border border-border px-3 py-3">
          <input
            id="employee-active"
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
          />
          <label htmlFor="employee-active" className="text-sm font-medium text-foreground">
            Employé actif
          </label>
        </div>
      </div>
    </div>
  );
}

export default EmployeeForm;
