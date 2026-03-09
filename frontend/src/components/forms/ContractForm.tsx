'use client';

import React, { useState } from 'react';
import { useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContractFormProps {
  contract?: any;
  employees?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ContractForm({ contract, employees = [], onSuccess, onCancel }: ContractFormProps) {
  const [formData, setFormData] = useState({
    employeeId: contract?.employeeId || contract?.employee_id || '',
    contractType: contract?.contractType || contract?.contract_type || 'CDI',
    startDate: contract?.startDate || contract?.start_date || '',
    endDate: contract?.endDate || contract?.end_date || '',
    salary: contract?.salary || '',
    currency: contract?.currency || 'XOF',
    workHoursPerWeek: contract?.workHoursPerWeek || contract?.work_hours_per_week || 40,
    position: contract?.position || '',
    department: contract?.department || '',
    benefits: contract?.benefits || '',
    clauses: contract?.clauses || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract();

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'Employé requis';
    if (!formData.contractType) newErrors.contractType = 'Type de contrat requis';
    if (!formData.startDate) newErrors.startDate = 'Date de début requise';
    if (!formData.salary || formData.salary <= 0) newErrors.salary = 'Salaire requis et doit être > 0';
    if (!formData.position) newErrors.position = 'Poste requis';
    if (!formData.department) newErrors.department = 'Département requis';

    if (formData.contractType === 'CDD' && !formData.endDate) {
      newErrors.endDate = 'Date de fin requise pour un CDD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (contract?.id) {
        await updateMutation.mutateAsync({
          id: contract.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {contract ? 'Modifier le contrat' : 'Nouveau contrat'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employé */}
        <div>
          <Label htmlFor="employeeId">Employé *</Label>
          <select
            id="employeeId"
            value={formData.employeeId}
            onChange={(e) => handleChange('employeeId', e.target.value)}
            className={`w-full h-10 px-3 rounded-md border border-input bg-background ${errors.employeeId ? 'border-red-500' : ''}`}
          >
            <option value="">Sélectionner un employé</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
          {errors.employeeId && (
            <p className="text-sm text-red-600 mt-1">{errors.employeeId}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type de contrat */}
          <div>
            <Label htmlFor="contractType">Type de contrat *</Label>
            <select
              id="contractType"
              value={formData.contractType}
              onChange={(e) => handleChange('contractType', e.target.value)}
              className={`w-full h-10 px-3 rounded-md border border-input bg-background ${errors.contractType ? 'border-red-500' : ''}`}
            >
              <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
              <option value="CDD">CDD - Contrat à Durée Déterminée</option>
              <option value="STAGE">STAGE - Convention de Stage</option>
              <option value="FREELANCE">FREELANCE - Contrat de Freelance</option>
            </select>
            {errors.contractType && (
              <p className="text-sm text-red-600 mt-1">{errors.contractType}</p>
            )}
          </div>

          {/* Poste */}
          <div>
            <Label htmlFor="position">Poste *</Label>
            <Input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              className={errors.position ? 'border-red-500' : ''}
              placeholder="Ex: Développeur Senior"
            />
            {errors.position && (
              <p className="text-sm text-red-600 mt-1">{errors.position}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date de début */}
          <div>
            <Label htmlFor="startDate">Date de début *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={errors.startDate ? 'border-red-500' : ''}
            />
            {errors.startDate && (
              <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>
            )}
          </div>

          {/* Date de fin */}
          <div>
            <Label htmlFor="endDate">
              Date de fin {formData.contractType === 'CDD' && '*'}
            </Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className={errors.endDate ? 'border-red-500' : ''}
              disabled={formData.contractType === 'CDI'}
            />
            {errors.endDate && (
              <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salaire */}
          <div className="md:col-span-2">
            <Label htmlFor="salary">Salaire mensuel brut *</Label>
            <Input
              id="salary"
              type="number"
              min="0"
              step="1000"
              value={formData.salary}
              onChange={(e) => handleChange('salary', parseFloat(e.target.value))}
              className={errors.salary ? 'border-red-500' : ''}
              placeholder="Ex: 500000"
            />
            {errors.salary && (
              <p className="text-sm text-red-600 mt-1">{errors.salary}</p>
            )}
          </div>

          {/* Devise */}
          <div>
            <Label htmlFor="currency">Devise</Label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="XOF">XOF (Franc CFA)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (Dollar)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Département */}
          <div>
            <Label htmlFor="department">Département *</Label>
            <Input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className={errors.department ? 'border-red-500' : ''}
              placeholder="Ex: IT, RH, Finance"
            />
            {errors.department && (
              <p className="text-sm text-red-600 mt-1">{errors.department}</p>
            )}
          </div>

          {/* Heures de travail */}
          <div>
            <Label htmlFor="workHoursPerWeek">Heures de travail par semaine</Label>
            <Input
              id="workHoursPerWeek"
              type="number"
              min="1"
              max="80"
              value={formData.workHoursPerWeek}
              onChange={(e) => handleChange('workHoursPerWeek', parseInt(e.target.value))}
              placeholder="40"
            />
          </div>
        </div>

        {/* Avantages */}
        <div>
          <Label htmlFor="benefits">Avantages</Label>
          <Textarea
            id="benefits"
            rows={3}
            value={formData.benefits}
            onChange={(e) => handleChange('benefits', e.target.value)}
            placeholder="Ex: Assurance santé, tickets restaurant, transport..."
          />
        </div>

        {/* Clauses particulières */}
        <div>
          <Label htmlFor="clauses">Clauses particulières</Label>
          <Textarea
            id="clauses"
            rows={4}
            value={formData.clauses}
            onChange={(e) => handleChange('clauses', e.target.value)}
            placeholder="Ex: Période d'essai, clause de non-concurrence, mobilité..."
          />
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-4 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : contract ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
