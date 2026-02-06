'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { hrService, CalculateSalaryRequest, SalaryCalculation } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface SalaryCalculatorProps {
  employeeId?: string;
}

export default function SalaryCalculator({ employeeId }: SalaryCalculatorProps) {
  const [grossSalary, setGrossSalary] = useState<string>('');
  const [bonuses, setBonuses] = useState<string>('0');
  const [deductions, setDeductions] = useState<string>('0');
  const [result, setResult] = useState<SalaryCalculation | null>(null);

  const calculateMutation = useMutation({
    mutationFn: (data: CalculateSalaryRequest) => hrService.calculateSalary(data),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Calcul effectué avec succès');
    },
    onError: () => {
      toast.error('Erreur lors du calcul du salaire');
    },
  });

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const gross = parseFloat(grossSalary);
    if (isNaN(gross) || gross <= 0) {
      toast.error('Veuillez entrer un salaire de base valide');
      return;
    }

    calculateMutation.mutate({
      grossSalary: gross,
      bonuses: parseFloat(bonuses) || 0,
      deductions: parseFloat(deductions) || 0,
      employeeId: employeeId,
    });
  };

  const handleReset = () => {
    setGrossSalary('');
    setBonuses('0');
    setDeductions('0');
    setResult(null);
  };

  // Calculs simplifiés pour la Côte d'Ivoire (taux approximatifs)
  // En pratique, ces taux devraient venir du backend
  const calculateBreakdown = () => {
    if (!result) return null;

    const gross = parseFloat(grossSalary);
    const bonus = parseFloat(bonuses) || 0;
    const deduction = parseFloat(deductions) || 0;

    // Cotisations sociales Côte d'Ivoire (taux indicatifs)
    const cnps = gross * 0.068; // 6.8% part salarié
    const cnam = gross * 0.015; // 1.5%
    const fdfp = gross * 0.012; // 1.2%
    const at = gross * 0.02; // 2% (peut varier selon l'activité)
    
    // IRPP - Barème progressif (simplifié)
    const taxableIncome = gross + bonus - cnps - cnam - fdfp;
    let irpp = 0;
    
    if (taxableIncome <= 50000) {
      irpp = 0;
    } else if (taxableIncome <= 130000) {
      irpp = (taxableIncome - 50000) * 0.15;
    } else if (taxableIncome <= 200000) {
      irpp = 12000 + (taxableIncome - 130000) * 0.20;
    } else if (taxableIncome <= 300000) {
      irpp = 26000 + (taxableIncome - 200000) * 0.25;
    } else if (taxableIncome <= 400000) {
      irpp = 51000 + (taxableIncome - 300000) * 0.35;
    } else {
      irpp = 86000 + (taxableIncome - 400000) * 0.40;
    }

    const totalDeductions = cnps + cnam + fdfp + irpp + deduction;
    const netSalary = gross + bonus - totalDeductions;

    // Cotisations patronales
    const cnpsEmployer = gross * 0.084; // 8.4%
    const cnamEmployer = gross * 0.035; // 3.5%
    const fdfpEmployer = gross * 0.012; // 1.2%
    const atEmployer = gross * at; // Variable
    const employerContributions = cnpsEmployer + cnamEmployer + fdfpEmployer + atEmployer;

    return {
      cnps,
      cnam,
      fdfp,
      at,
      irpp,
      totalDeductions,
      netSalary,
      employerContributions,
      totalCost: gross + bonus + employerContributions,
    };
  };

  const breakdown = calculateBreakdown();

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Calculateur de salaire (Côte d'Ivoire)
      </h2>

      <form onSubmit={handleCalculate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="grossSalary">Salaire de base (FCFA) *</Label>
            <Input
              id="grossSalary"
              type="number"
              step="0.01"
              placeholder="500000"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="bonuses">Primes (FCFA)</Label>
            <Input
              id="bonuses"
              type="number"
              step="0.01"
              placeholder="0"
              value={bonuses}
              onChange={(e) => setBonuses(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="deductions">Autres déductions (FCFA)</Label>
            <Input
              id="deductions"
              type="number"
              step="0.01"
              placeholder="0"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={calculateMutation.isPending}
          >
            {calculateMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Calcul en cours...
              </>
            ) : (
              'Calculer'
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset}
          >
            Réinitialiser
          </Button>
        </div>
      </form>

      {breakdown && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Détails du calcul
            </h3>

            {/* Salaire brut */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-white">Salaire brut</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(parseFloat(grossSalary))}
                </span>
              </div>
            </div>

            {/* Primes */}
            {parseFloat(bonuses) > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Primes</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(parseFloat(bonuses))}
                </span>
              </div>
            )}

            {/* Cotisations salariales */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cotisations salariales
              </p>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    CNPS (6.8%)
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      maximumFractionDigits: 0,
                    }).format(breakdown.cnps)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    CNAM (1.5%)
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      maximumFractionDigits: 0,
                    }).format(breakdown.cnam)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    FDFP (1.2%)
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      maximumFractionDigits: 0,
                    }).format(breakdown.fdfp)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    IRPP (Impôt progressif)
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      maximumFractionDigits: 0,
                    }).format(breakdown.irpp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Autres déductions */}
            {parseFloat(deductions) > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Autres déductions</span>
                <span className="text-sm text-red-600 dark:text-red-400">
                  -{new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(parseFloat(deductions))}
                </span>
              </div>
            )}

            {/* Net à payer */}
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">Net à payer</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(breakdown.netSalary)}
                </span>
              </div>
            </div>

            {/* Charges patronales */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Charges patronales (information)
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Coût total employeur
                  </span>
                  <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF',
                      maximumFractionDigits: 0,
                    }).format(breakdown.totalCost)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Incluant CNPS patronale (8.4%), CNAM (3.5%), FDFP (1.2%), AT (2%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
