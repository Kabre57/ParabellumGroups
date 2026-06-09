'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

interface PayslipDeduction {
  label: string;
  rate?: number;
  amount: number;
}

interface PayslipPrintProps {
  salary: {
    id: string;
    employee: {
      firstName: string;
      lastName: string;
      matricule?: string;
      cnpsNumber?: string;
      cnamNumber?: string;
      position?: string;
      category?: string;        // Catégorie (Employé 2, etc.)
      convention?: string;      // Convention (Industries, etc.)
      taxParts?: number;        // Parts fiscales
      hireDate?: string;        // Date d'embauche (YYYY-MM-DD)
    };
    period: string;             // Mois et année (YYYY-MM)
    baseSalary: number;
    overtime?: {
      rate15?: number;  // heures à 15%
      rate50?: number;  // heures à 50%
      rate75?: number;  // heures à 75%
      rate100?: number; // heures à 100%
    };
    seniorityBonus?: number;    // Ancienneté
    sursalary?: number;         // Sursalaire
    mealAllowance?: number;     // Prime de panier (par jour)
    mealDays?: number;          // Nombre de jours
    dirtAllowance?: number;     // Prime de salissure
    transportAllowance?: number; // Indemnité de transport
    gratification?: number;     // Gratification
    otherBonuses?: number;      // Autres primes
    deductions?: PayslipDeduction[];
    netSalary: number;
    createdAt: string;
    // Infos complémentaires pour le bas du bulletin
    returnFromLeave?: string;   // Date retour congé
    leaveDaysAccumulated?: number; // Cumul jours congé
    leaveBase?: number;         // Base congé
    yearCumul?: {               // Cumuls 2023
      fiscalDays?: number;
      taxableGross?: number;
      incomeTax?: number;
      cmuContribution?: number;
      cnpsBase?: number;
      pensionContribution?: number;
    };
  };
  onClose: () => void;
}

export default function PayslipPrint({ salary, onClose }: PayslipPrintProps) {
  const { companyName } = useEnterpriseLogo();

  // Normalisation des déductions
  const normalizedDeductions = (() => {
    if (Array.isArray(salary.deductions)) return salary.deductions;
    if (typeof salary.deductions === 'string') {
      try {
        const parsed = JSON.parse(salary.deductions);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Calculs des gains
  const baseSalary = salary.baseSalary;
  const sursalary = salary.sursalary || 0;
  const seniorityBonus = salary.seniorityBonus || 0;
  const overtime15 = (salary.overtime?.rate15 || 0) * (baseSalary / 30 / 8); // taux horaire simplifié
  const overtime50 = (salary.overtime?.rate50 || 0) * (baseSalary / 30 / 8);
  const overtime75 = (salary.overtime?.rate75 || 0) * (baseSalary / 30 / 8);
  const overtime100 = (salary.overtime?.rate100 || 0) * (baseSalary / 30 / 8);
  const mealAllowance = (salary.mealAllowance || 0) * (salary.mealDays || 0);
  const dirtAllowance = salary.dirtAllowance || 0;
  const transportAllowance = salary.transportAllowance || 0;
  const gratification = salary.gratification || 0;
  const otherBonuses = salary.otherBonuses || 0;

  const totalGains = baseSalary + sursalary + seniorityBonus + overtime15 + overtime50 + overtime75 + overtime100 +
                     mealAllowance + dirtAllowance + transportAllowance + gratification + otherBonuses;

  // Calcul des retenues
  const cnpsContribution = baseSalary * 0.063; // 6.3% dans l'exemple
  const isContribution = totalGains * 0.012;   // I.S 1.2%
  const cnContribution = 6159; // Valeur fixe exemple, à adapter
  const igr = 6765;             // Valeur fixe exemple
  const cmu = 2500;
  const totalRetenues = isContribution + cnContribution + igr + cnpsContribution + cmu +
                        normalizedDeductions.reduce((sum, d) => sum + d.amount, 0);
  const netAPayer = totalGains - totalRetenues;

  // Données employeur (statiques pour l'exemple)
  const employer = {
    zoneIndustrielle: 'YOPOUGON',
    immatriculationCNPS: '054738',
    rccm: '10 094626',
    compteContribuable: '8701805R',
  };

  // Données salarié enrichies
  const employee = salary.employee;
  const hireDate = employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '15-mai-03';
  const taxParts = employee.taxParts || 4;

  return (
    <PrintLayout
      title="BULLETIN DE PAIE"
      subtitle={`Période: ${formatPeriod(salary.period)}`}
      meta={`Date: ${formatDate(salary.createdAt)}`}
      onClose={onClose}
    >
      {/* En-tête type SAPLED */}
      <div className="border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p><strong>ZONE INDUSTRIELLE</strong><br />{employer.zoneIndustrielle}</p>
            <p><strong>IMMATRICULATION CNPS</strong><br />{employer.immatriculationCNPS}</p>
          </div>
          <div>
            <p><strong>R.C.C.M</strong><br />{employer.rccm}</p>
            <p><strong>Compte Contribuable</strong><br />{employer.compteContribuable}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">BULLETIN DE PAIE</p>
            <p>{formatPeriod(salary.period)}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4 text-sm border-t pt-3">
          <div><strong>Affectation</strong><br />Siège</div>
          <div><strong>Service</strong><br />{employee.position || 'Logistique'}</div>
          <div><strong>Nom et Prénoms</strong><br />{employee.lastName.toUpperCase()} {employee.firstName}</div>
          <div><strong>Matricule</strong><br />{employee.matricule || '718'}</div>
          <div><strong>Convention</strong><br />{employee.convention || 'Industries'}</div>
          <div><strong>Parts fiscales</strong><br />{taxParts}</div>
          <div><strong>Salarié</strong><br />Mensuel</div>
          <div><strong>Catégorie</strong><br />{employee.category || 'Employé 2'}</div>
          <div><strong>Date d'embauche</strong><br />{hireDate}</div>
          <div><strong>Numéro CNPS</strong><br />{employee.cnpsNumber || '173010158356'}</div>
        </div>
      </div>

      {/* Tableau principal */}
      <div className="mb-6">
        <table className="w-full border-collapse text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="text-left py-2 px-2 font-semibold">CODES</th>
              <th className="text-left py-2 px-2 font-semibold">LIBELLES</th>
              <th className="text-right py-2 px-2 font-semibold">BASES</th>
              <th className="text-right py-2 px-2 font-semibold">HR/JR</th>
              <th className="text-right py-2 px-2 font-semibold">GAINS</th>
              <th className="text-right py-2 px-2 font-semibold">RETENUES</th>
             </tr>
          </thead>
          <tbody>
            {/* Salaire de base */}
            <tr className="border-b">
              <td className="py-1 px-2">100</td>
              <td className="py-1 px-2">SALAIRE DE BASE</td>
              <td className="text-right py-1 px-2">{formatNumber(baseSalary)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(baseSalary)}</td>
              <td className="text-right py-1 px-2"></td>
             </tr>
            {/* Sursalaire */}
            {sursalary > 0 && <tr className="border-b">
              <td className="py-1 px-2">110</td>
              <td className="py-1 px-2">SURSALAIRE</td>
              <td className="text-right py-1 px-2">{formatNumber(sursalary)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(sursalary)}</td>
              <td></td>
             </tr>}
            {/* Ancienneté */}
            {seniorityBonus > 0 && <tr className="border-b">
              <td className="py-1 px-2">120</td>
              <td className="py-1 px-2">ANCIENNETÉ 20 ANS</td>
              <td className="text-right py-1 px-2">{formatNumber(seniorityBonus)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(seniorityBonus)}</td>
              <td></td>
             </tr>}
            {/* Heures sup 15% */}
            {(salary.overtime?.rate15 || 0) > 0 && <tr className="border-b">
              <td className="py-1 px-2">220</td>
              <td className="py-1 px-2">HEURES SUPPLÉMENTAIRES 15%</td>
              <td className="text-right py-1 px-2">{formatNumber(salary.overtime!.rate15!)}</td>
              <td className="text-right py-1 px-2">32</td>
              <td className="text-right py-1 px-2">{formatCurrency(overtime15)}</td>
              <td></td>
             </tr>}
            {/* Heures sup 50% */}
            {(salary.overtime?.rate50 || 0) > 0 && <tr className="border-b">
              <td className="py-1 px-2">230</td>
              <td className="py-1 px-2">HEURES SUPPLÉMENTAIRES 50%</td>
              <td className="text-right py-1 px-2">{formatNumber(salary.overtime!.rate50!)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(overtime50)}</td>
              <td></td>
             </tr>}
            {/* Heures sup 75% */}
            {(salary.overtime?.rate75 || 0) > 0 && <tr className="border-b">
              <td className="py-1 px-2">240</td>
              <td className="py-1 px-2">HEURES SUPPLÉMENTAIRES 75%</td>
              <td className="text-right py-1 px-2">{formatNumber(salary.overtime!.rate75!)}</td>
              <td className="text-right py-1 px-2">0</td>
              <td className="text-right py-1 px-2">{formatCurrency(overtime75)}</td>
              <td></td>
             </tr>}
            {/* Heures sup 100% */}
            {(salary.overtime?.rate100 || 0) > 0 && <tr className="border-b">
              <td className="py-1 px-2">250</td>
              <td className="py-1 px-2">HEURES SUPPLÉMENTAIRES 100%</td>
              <td className="text-right py-1 px-2">{formatNumber(salary.overtime!.rate100!)}</td>
              <td className="text-right py-1 px-2">0</td>
              <td className="text-right py-1 px-2">{formatCurrency(overtime100)}</td>
              <td></td>
             </tr>}
            {/* Prime panier */}
            {(salary.mealAllowance || 0) > 0 && <tr className="border-b">
              <td className="py-1 px-2">760</td>
              <td className="py-1 px-2">PRIME DE PANIER</td>
              <td className="text-right py-1 px-2">{formatNumber(salary.mealAllowance!)}</td>
              <td className="text-right py-1 px-2">{salary.mealDays || 16}</td>
              <td className="text-right py-1 px-2">{formatCurrency(mealAllowance)}</td>
              <td></td>
             </tr>}
            {/* Prime salissure */}
            {dirtAllowance > 0 && <tr className="border-b">
              <td className="py-1 px-2">780</td>
              <td className="py-1 px-2">PRIME DE SALISSURE</td>
              <td className="text-right py-1 px-2">{formatNumber(dirtAllowance)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(dirtAllowance)}</td>
              <td></td>
             </tr>}
            {/* Indemnité transport */}
            {transportAllowance > 0 && <tr className="border-b">
              <td className="py-1 px-2">740</td>
              <td className="py-1 px-2">INDEMNITE DE TRANSPORT</td>
              <td className="text-right py-1 px-2">{formatNumber(transportAllowance)}</td>
              <td className="text-right py-1 px-2">30</td>
              <td className="text-right py-1 px-2">{formatCurrency(transportAllowance)}</td>
              <td></td>
             </tr>}
            {/* Gratification */}
            {gratification > 0 && <tr className="border-b">
              <td className="py-1 px-2">0</td>
              <td className="py-1 px-2">GRATIFICATIONS</td>
              <td className="text-right py-1 px-2">{formatNumber(gratification)}</td>
              <td className="text-right py-1 px-2">360</td>
              <td className="text-right py-1 px-2">{formatCurrency(gratification)}</td>
              <td></td>
             </tr>}
            {/* Autres primes éventuelles */}
            {otherBonuses > 0 && <tr className="border-b">
              <td className="py-1 px-2">390</td>
              <td className="py-1 px-2">PRIME EXCEPTIONNELLE</td>
              <td className="text-right py-1 px-2">{formatNumber(otherBonuses)}</td>
              <td className="text-right py-1 px-2">0</td>
              <td className="text-right py-1 px-2">{formatCurrency(otherBonuses)}</td>
              <td></td>
             </tr>}
            {/* Retenues */}
            <tr className="border-b">
              <td className="py-1 px-2">600</td>
              <td className="py-1 px-2">I.S</td>
              <td className="text-right py-1 px-2">{formatNumber(totalGains)}</td>
              <td className="text-right py-1 px-2">1.20%</td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(isContribution)}</td>
             </tr>
            <tr className="border-b">
              <td className="py-1 px-2">610</td>
              <td className="py-1 px-2">C.N.</td>
              <td className="text-right py-1 px-2">{formatNumber(totalGains)}</td>
              <td></td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(cnContribution)}</td>
             </tr>
            <tr className="border-b">
              <td className="py-1 px-2">620</td>
              <td className="py-1 px-2">I.G.R</td>
              <td className="text-right py-1 px-2">{formatNumber(totalGains)}</td>
              <td></td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(igr)}</td>
             </tr>
            <tr className="border-b">
              <td className="py-1 px-2">640</td>
              <td className="py-1 px-2">C.N.P.S</td>
              <td className="text-right py-1 px-2">{formatNumber(baseSalary)}</td>
              <td className="text-right py-1 px-2">6.30%</td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(cnpsContribution)}</td>
             </tr>
            <tr className="border-b">
              <td className="py-1 px-2">670</td>
              <td className="py-1 px-2">C.M.U</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(cmu)}</td>
             </tr>
            {normalizedDeductions.map((ded, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-1 px-2">800</td>
                <td className="py-1 px-2">{ded.label}</td>
                <td className="text-right py-1 px-2">-</td>
                <td className="text-right py-1 px-2">{ded.rate ? `${ded.rate}%` : '-'}</td>
                <td></td>
                <td className="text-right py-1 px-2 text-red-600">-{formatCurrency(ded.amount)}</td>
               </tr>
            ))}
            {/* Sous-totaux */}
            <tr className="border-t-2 border-gray-400 font-semibold">
              <td colSpan={4} className="text-right py-2 px-2">Sous totaux</td>
              <td className="text-right py-2 px-2">{formatCurrency(totalGains)}</td>
              <td className="text-right py-2 px-2 text-red-600">{formatCurrency(totalRetenues)}</td>
             </tr>
            <tr className="border-b">
              <td colSpan={4} className="text-right py-2 px-2">Salaire net</td>
              <td colSpan={2} className="text-right py-2 px-2 font-bold">{formatCurrency(totalGains - totalRetenues)}</td>
             </tr>
            <tr className="border-t-2 border-gray-400">
              <td className="py-1 px-2">800</td>
              <td className="py-1 px-2">RETENUE</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="text-right py-1 px-2 text-red-600">{formatCurrency(totalRetenues)}</td>
             </tr>
            <tr className="font-bold bg-gray-50">
              <td colSpan={4} className="text-right py-2 px-2">Totaux</td>
              <td className="text-right py-2 px-2">{formatCurrency(totalGains)}</td>
              <td className="text-right py-2 px-2 text-red-600">{formatCurrency(totalRetenues)}</td>
             </tr>
            <tr className="bg-green-100">
              <td colSpan={4} className="text-right py-2 px-2 text-lg font-bold">Net à payer</td>
              <td colSpan={2} className="text-right py-2 px-2 text-lg font-bold text-green-700">{formatCurrency(salary.netSalary)}</td>
             </tr>
          </tbody>
         </table>
      </div>

      {/* Infos congés et cumuls */}
      <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
        <div className="border p-3">
          <p><strong>Retour congé</strong> {salary.returnFromLeave || '01/10/2023'}</p>
          <p><strong>Cumul jours</strong> {salary.leaveDaysAccumulated || 90}</p>
          <p><strong>Base congé</strong> {formatCurrency(salary.leaveBase || 555316)}</p>
        </div>
        <div className="border p-3">
          <p><strong>CUMUL 2023</strong></p>
          <p>Jours fiscaux : {salary.yearCumul?.fiscalDays || 398}</p>
          <p>Brut imposable : {formatCurrency(salary.yearCumul?.taxableGross || 2345998)}</p>
          <p>Base imposable : {formatCurrency(salary.yearCumul?.taxableGross || 2345998)}</p>
          <p>Impôt sur salaires : {formatCurrency(salary.yearCumul?.incomeTax || 28152)}</p>
          <p>Cotisation CMU : {formatCurrency(salary.yearCumul?.cmuContribution || 31500)}</p>
          <p>Base CNPS : {formatCurrency(salary.yearCumul?.cnpsBase || 2070610)}</p>
          <p>Cotisation retraite : {formatCurrency(salary.yearCumul?.pensionContribution || 130449)}</p>
        </div>
      </div>

      {/* Mentions légales */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-xs text-gray-600">
          <strong>Mentions légales (Article L.143-3 du Code du Travail):</strong>
          <br />
          Le présent bulletin de paie doit être conservé sans limitation de durée. Il constitue
          une pièce justificative pour le calcul des droits à la retraite.
          <br />
          Les cotisations sociales sont versées aux organismes compétents conformément à la
          législation ivoirienne.
        </p>
      </div>
    </PrintLayout>
  );
}