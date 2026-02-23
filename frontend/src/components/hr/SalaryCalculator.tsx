'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

/**
 * Calculateur 100% front, conforme aux r�gles CI (CNPS, IS/AS, IGR avec quotient familial + CMU forfait par assur�/ayants droit).
 */

type Breakdown = {
  baseSociale: number;
  bonus: number;
  exempt: number;
  cnps: number;
  cnam: number;
  isAmount: number;
  asAmount: number;
  igr: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  employerContributions: number;
  totalCost: number;
};

export default function SalaryCalculator() {
  const [grossSalary, setGrossSalary] = useState<string>('');
  const [taxableBonuses, setTaxableBonuses] = useState<string>('0');
  const [exemptAllowances, setExemptAllowances] = useState<string>('0');
  const [otherDeductions, setOtherDeductions] = useState<string>('0');
  const [parts, setParts] = useState<number>(1);
  const [cnpsAT, setCnpsAT] = useState<string>('2'); // 2% par d�faut
  const [useFlatCnam, setUseFlatCnam] = useState<boolean>(false);
  const [ayants, setAyants] = useState<string>('0'); // conjoint + enfants
  const [loading, setLoading] = useState(false);

  const breakdown = useMemo<Breakdown | null>(() => {
    const gross = parseFloat(grossSalary);
    if (isNaN(gross) || gross <= 0) return null;

    const bonus = parseFloat(taxableBonuses) || 0;
    const exempt = parseFloat(exemptAllowances) || 0;
    const other = parseFloat(otherDeductions) || 0;
    const partsCount = Math.min(Math.max(parts || 1, 1), 5);
    const ayantsDroit = Math.max(parseInt(ayants || '0', 10), 0);

    // Constantes CI
    const SMIG = 75000;
    const CEILING_RET = 1_647_315; // CNPS retraite
    const CEILING_AT = 70_000; // PF + AT
    const CNPS_EMP = 0.063;
    const CNPS_EMPLOYER_RET = 0.077;
    const CNPS_FAMILY = 0.0575;
    const CNPS_AT_RATE = Math.max(parseFloat(cnpsAT || '0') / 100, 0);
    const CNAM_RATE = 0.0333; // si non forfait
    const FDFP = 0.004;
    const IS = 0.012;
    const AS = 0.012;
    const ABATTEMENT_PRO = 0.2;

    // Assiette sociale : salaire + primes imposables
    const baseSociale = gross + bonus;

    const assietteRet = Math.min(Math.max(baseSociale, SMIG), CEILING_RET);
    const assietteAT = Math.min(Math.max(baseSociale, SMIG), CEILING_AT);
    const cnpsSalarie = assietteRet * CNPS_EMP;

    // IS/AS sur 80% du brut social
    const baseISAS = baseSociale * 0.8;
    const isAmount = baseISAS * IS;
    const asAmount = baseISAS * AS;

    // CMU / CNAM salariale
    const cnam = useFlatCnam ? (1 + ayantsDroit) * 1000 : baseSociale * CNAM_RATE;

    const revenuImposable = baseSociale - cnpsSalarie - isAmount - asAmount - (useFlatCnam ? cnam : 0);
    const abattement = revenuImposable * ABATTEMENT_PRO;
    const revenuApresAbattement = Math.max(0, revenuImposable - abattement);

    // Quotient familial
    const quotient = revenuApresAbattement / partsCount;

    // Bar�me IGR CI (progressif, marginal)
    const tranches = [
      { min: 0, max: 25_000, rate: 0 },
      { min: 25_000, max: 45_000, rate: 0.10 },
      { min: 45_000, max: 75_000, rate: 0.15 },
      { min: 75_000, max: 150_000, rate: 0.20 },
      { min: 150_000, max: 250_000, rate: 0.26 },
      { min: 250_000, max: 500_000, rate: 0.30 },
      { min: 500_000, max: Infinity, rate: 0.35 },
    ];

    const calcIgrMarginal = (amount: number) => {
      let remaining = amount;
      let tax = 0;
      for (let i = 0; i < tranches.length; i++) {
        const { min, max, rate } = tranches[i];
        if (remaining <= min) break;
        const taxableSlice = Math.min(remaining, max) - min;
        tax += taxableSlice * rate;
        if (remaining <= max) break;
      }
      return Math.max(tax, 0);
    };

    const igrPart = calcIgrMarginal(quotient);
    const igr = igrPart * partsCount;

    const totalDeductions = cnpsSalarie + cnam + isAmount + asAmount + igr + other;
    const netSalary = baseSociale + exempt - totalDeductions;

    // Charges patronales (info)
    const cnpsRetEmployer = assietteRet * CNPS_EMPLOYER_RET;
    const cnpsFamily = assietteAT * CNPS_FAMILY;
    const cnpsATPatronal = assietteAT * CNPS_AT_RATE;
    const cnamEmployer = useFlatCnam ? cnam : baseSociale * CNAM_RATE;
    const fdfpEmployer = baseSociale * FDFP;
    const employerContributions = cnpsRetEmployer + cnpsFamily + cnpsATPatronal + cnamEmployer + fdfpEmployer;

    return {
      baseSociale,
      bonus,
      exempt,
      cnps: cnpsSalarie,
      cnam,
      isAmount,
      asAmount,
      igr,
      otherDeductions: other,
      totalDeductions,
      netSalary,
      employerContributions,
      totalCost: baseSociale + exempt + employerContributions,
    };
  }, [grossSalary, taxableBonuses, exemptAllowances, otherDeductions, parts, cnpsAT, useFlatCnam, ayants]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossSalary);
    if (isNaN(gross) || gross <= 0) {
      toast.error('Veuillez entrer un salaire de base valide');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!breakdown) {
        toast.error('Impossible de calculer, v�rifiez vos champs.');
        return;
      }
      toast.success('Calcul effectu� avec succ�s');
    }, 80);
  };

  const handleReset = () => {
    setGrossSalary('');
    setTaxableBonuses('0');
    setExemptAllowances('0');
    setOtherDeductions('0');
    setParts(1);
    setCnpsAT('2');
    setAyants('0');
    setUseFlatCnam(false);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Calculateur de salaire (C�te d'Ivoire)
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
            <Label htmlFor="bonuses">Primes imposables (FCFA)</Label>
            <Input
              id="bonuses"
              type="number"
              step="0.01"
              placeholder="0"
              value={taxableBonuses}
              onChange={(e) => setTaxableBonuses(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="exempt">Indemnit�s exon�r�es (transport, logement�) (FCFA)</Label>
            <Input
              id="exempt"
              type="number"
              step="0.01"
              placeholder="0"
              value={exemptAllowances}
              onChange={(e) => setExemptAllowances(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="deductions">Autres d�ductions (FCFA)</Label>
            <Input
              id="deductions"
              type="number"
              step="0.01"
              placeholder="0"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="parts">Parts fiscales (1 � 5)</Label>
            <Input
              id="parts"
              type="number"
              min={1}
              max={5}
              value={parts}
              onChange={(e) => setParts(parseInt(e.target.value || '1', 10))}
            />
          </div>
          <div>
            <Label htmlFor="cnpsAT">Taux AT (%)</Label>
            <Input
              id="cnpsAT"
              type="number"
              step="0.1"
              min={0}
              value={cnpsAT}
              onChange={(e) => setCnpsAT(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input
              id="flatCnam"
              type="checkbox"
              checked={useFlatCnam}
              onChange={(e) => setUseFlatCnam(e.target.checked)}
            />
            <Label htmlFor="flatCnam">CMU forfaitaire (1 000 / assur�)</Label>
          </div>
          <div>
            <Label htmlFor="ayants">Nb. ayants droit (conjoint + enfants)</Label>
            <Input
              id="ayants"
              type="number"
              min={0}
              value={ayants}
              onChange={(e) => setAyants(e.target.value)}
              disabled={!useFlatCnam}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Calcul en cours...
              </>
            ) : (
              'Calculer'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            R�initialiser
          </Button>
        </div>
      </form>

      {breakdown && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">D�tails du calcul</h3>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900 dark:text-white">Salaire brut social</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.baseSociale)}
                </span>
              </div>
            </div>

            {breakdown.bonus > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Primes imposables</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.bonus)}
                </span>
              </div>
            )}
            {breakdown.exempt > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Indemnit�s exon�r�es</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  +{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.exempt)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cotisations salariales</p>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CNPS (6,3% plafonn� 1 647 315)</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.cnps)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CMU / CNAM</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.cnam)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IS (1,2%)</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.isAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">AS (1,2%)</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.asAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IGR (quotient familial)</span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.igr)}
                  </span>
                </div>
              </div>
            </div>

            {parseFloat(otherDeductions) > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Autres d�ductions</span>
                <span className="text-sm text-red-600 dark:text-red-400">
                  -{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(parseFloat(otherDeductions))}
                </span>
              </div>
            )}

            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">Net � payer</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.netSalary)}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Charges patronales (information)</p>
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Cout total employeur</span>
                  <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(breakdown.totalCost)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Incluant CNPS patronale (7,7%), prestations familiales (5,75%), AT ({cnpsAT}% plafonné 70 000), CMU (forfait ou 3,33%), FDFP (0,4%).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
