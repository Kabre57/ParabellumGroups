'use client';

import React, { useState, useEffect } from 'react';
import { useCreatePayslip, useUpdatePayslip } from '@/hooks/usePayslips';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface PayslipFormProps {
  payslip?: any;
  employees?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Deduction {
  label: string;
  rate?: number;
  amount: number;
}

export default function PayslipForm({ payslip, employees = [], onSuccess, onCancel }: PayslipFormProps) {
  const [formData, setFormData] = useState({
    employeeId: payslip?.employeeId || payslip?.employee_id || '',
    period: payslip?.period || new Date().toISOString().slice(0, 7),
    baseSalary: payslip?.baseSalary || payslip?.base_salary || 0,
    overtime: payslip?.overtime || 0,
    bonuses: payslip?.bonuses || 0,
    allowances: payslip?.allowances || 0,
    currency: payslip?.currency || 'XOF',
  });

  const [deductions, setDeductions] = useState<Deduction[]>(
    payslip?.deductions
      ? typeof payslip.deductions === 'string'
        ? JSON.parse(payslip.deductions)
        : payslip.deductions
      : []
  );

  const [calculations, setCalculations] = useState({
    cnps: 0,
    cnam: 0,
    fdfp: 0,
    igr: 0,
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreatePayslip();
  const updateMutation = useUpdatePayslip();

  // Calculs automatiques
  useEffect(() => {
    const baseSalary = parseFloat(formData.baseSalary?.toString() || '0');
    const overtime = parseFloat(formData.overtime?.toString() || '0');
    const bonuses = parseFloat(formData.bonuses?.toString() || '0');
    const allowances = parseFloat(formData.allowances?.toString() || '0');

    const cnps = baseSalary * 0.036; // 3.6%
    const cnam = baseSalary * 0.035; // 3.5%
    const fdfp = baseSalary * 0.004; // 0.4%

    const grossSalary = baseSalary + overtime + bonuses + allowances;
    const socialContributions = cnps + cnam + fdfp;
    
    const taxableIncome = grossSalary - socialContributions;
    let igr = 0;
    if (taxableIncome <= 50000) igr = 0;
    else if (taxableIncome <= 130000) igr = (taxableIncome - 50000) * 0.015;
    else if (taxableIncome <= 200000) igr = 1200 + (taxableIncome - 130000) * 0.10;
    else if (taxableIncome <= 300000) igr = 8200 + (taxableIncome - 200000) * 0.15;
    else if (taxableIncome <= 1000000) igr = 23200 + (taxableIncome - 300000) * 0.20;
    else igr = 163200 + (taxableIncome - 1000000) * 0.25;

    const otherDeductions = deductions.reduce((sum, ded) => sum + ded.amount, 0);
    const totalDeductions = socialContributions + igr + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    setCalculations({
      cnps,
      cnam,
      fdfp,
      igr,
      grossSalary,
      totalDeductions,
      netSalary,
    });
  }, [formData, deductions]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const addDeduction = () => {
    setDeductions([...deductions, { label: '', amount: 0 }]);
  };

  const updateDeduction = (index: number, field: keyof Deduction, value: any) => {
    const newDeductions = [...deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setDeductions(newDeductions);
  };

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'Employé requis';
    if (!formData.period) newErrors.period = 'Période requise';
    if (!formData.baseSalary || formData.baseSalary <= 0) newErrors.baseSalary = 'Salaire de base requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const periodDate = new Date(formData.period);
    const payload = {
      ...formData,
      month: periodDate.getMonth() + 1,
      year: periodDate.getFullYear(),
      deductions,
    };

    try {
      if (payslip?.id) {
        await updateMutation.mutateAsync({
          id: payslip.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving payslip:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {payslip ? 'Modifier le bulletin' : 'Nouveau bulletin de paie'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employé */}
          <div>
            <Label htmlFor="employeeId">Employé *</Label>
            <Select
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              className={errors.employeeId ? 'border-red-500' : ''}
            >
              <option value="">Sélectionner un employé</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </Select>
            {errors.employeeId && (
              <p className="text-sm text-red-600 mt-1">{errors.employeeId}</p>
            )}
          </div>

          {/* Période */}
          <div>
            <Label htmlFor="period">Période *</Label>
            <Input
              id="period"
              type="month"
              value={formData.period}
              onChange={(e) => handleChange('period', e.target.value)}
              className={errors.period ? 'border-red-500' : ''}
            />
            {errors.period && (
              <p className="text-sm text-red-600 mt-1">{errors.period}</p>
            )}
          </div>
        </div>

        {/* Rémunération */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
            Rémunération
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseSalary">Salaire de base *</Label>
              <Input
                id="baseSalary"
                type="number"
                min="0"
                step="1000"
                value={formData.baseSalary}
                onChange={(e) => handleChange('baseSalary', parseFloat(e.target.value))}
                className={errors.baseSalary ? 'border-red-500' : ''}
              />
              {errors.baseSalary && (
                <p className="text-sm text-red-600 mt-1">{errors.baseSalary}</p>
              )}
            </div>

            <div>
              <Label htmlFor="overtime">Heures supplémentaires</Label>
              <Input
                id="overtime"
                type="number"
                min="0"
                step="1000"
                value={formData.overtime}
                onChange={(e) => handleChange('overtime', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="bonuses">Primes</Label>
              <Input
                id="bonuses"
                type="number"
                min="0"
                step="1000"
                value={formData.bonuses}
                onChange={(e) => handleChange('bonuses', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="allowances">Indemnités</Label>
              <Input
                id="allowances"
                type="number"
                min="0"
                step="1000"
                value={formData.allowances}
                onChange={(e) => handleChange('allowances', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Autres déductions */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              Autres déductions
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
              + Ajouter
            </Button>
          </div>

          <div className="space-y-3">
            {deductions.map((deduction, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label>Libellé</Label>
                  <Input
                    value={deduction.label}
                    onChange={(e) => updateDeduction(index, 'label', e.target.value)}
                    placeholder="Ex: Prêt bancaire, Avance..."
                  />
                </div>
                <div className="col-span-5">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={deduction.amount}
                    onChange={(e) =>
                      updateDeduction(index, 'amount', parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDeduction(index)}
                    className="text-red-600"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}

            {deductions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucune déduction supplémentaire
              </p>
            )}
          </div>
        </div>

        {/* Résumé des calculs */}
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
            Calculs automatiques
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Salaire brut:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calculations.grossSalary)}
              </span>
            </div>
            
            <div className="pl-4 space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>CNPS (3.6%):</span>
                <span>{formatCurrency(calculations.cnps)}</span>
              </div>
              <div className="flex justify-between">
                <span>CNAM (3.5%):</span>
                <span>{formatCurrency(calculations.cnam)}</span>
              </div>
              <div className="flex justify-between">
                <span>FDFP (0.4%):</span>
                <span>{formatCurrency(calculations.fdfp)}</span>
              </div>
              <div className="flex justify-between">
                <span>IGR:</span>
                <span>{formatCurrency(calculations.igr)}</span>
              </div>
              {deductions.map((ded, i) => (
                <div key={i} className="flex justify-between">
                  <span>{ded.label || `Déduction ${i + 1}`}:</span>
                  <span>{formatCurrency(ded.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2 border-t border-gray-300">
              <span className="text-gray-700 dark:text-gray-300">Total retenues:</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(calculations.totalDeductions)}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-gray-400">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Net à payer:
              </span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(calculations.netSalary)}
              </span>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-4 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : payslip ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
