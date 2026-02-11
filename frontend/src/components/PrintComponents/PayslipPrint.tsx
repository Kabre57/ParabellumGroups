'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

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
    };
    period: string;
    baseSalary: number;
    overtime?: number;
    bonuses?: number;
    allowances?: number;
    deductions?: PayslipDeduction[];
    netSalary: number;
    createdAt: string;
  };
  onClose: () => void;
}

export default function PayslipPrint({ salary, onClose }: PayslipPrintProps) {
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
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const date = new Date(period);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
  };

  const calculateCNPS = () => salary.baseSalary * 0.036;
  const calculateCNAM = () => salary.baseSalary * 0.035;
  const calculateFDFP = () => salary.baseSalary * 0.004;

  const calculateGrossSalary = () => {
    return (
      salary.baseSalary +
      (salary.overtime || 0) +
      (salary.bonuses || 0) +
      (salary.allowances || 0)
    );
  };

  const calculateTotalDeductions = () => {
    const socialContributions = calculateCNPS() + calculateCNAM() + calculateFDFP();
    const otherDeductions =
      salary.deductions?.reduce((sum, ded) => sum + ded.amount, 0) || 0;
    return socialContributions + otherDeductions;
  };

  return (
    <PrintLayout
      title="Bulletin de Paie"
      subtitle={`Période: ${formatPeriod(salary.period)}`}
      meta={`Date: ${formatDate(salary.createdAt)}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b border-gray-300 pb-1">
            Employeur
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Raison sociale:</span> PARABELLUM GROUP
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">IDU:</span> CI-2019-0046392 R
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">CNPS:</span> 1234567
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">CNAM:</span> 7654321
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">FDFP:</span> 9876543
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b border-gray-300 pb-1">
            Salarié
          </h3>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Nom et Prénom:</span>{' '}
              {salary.employee.lastName.toUpperCase()} {salary.employee.firstName}
            </p>
            {salary.employee.matricule && (
              <p className="text-gray-700">
                <span className="font-semibold">Matricule:</span> {salary.employee.matricule}
              </p>
            )}
            {salary.employee.position && (
              <p className="text-gray-700">
                <span className="font-semibold">Poste:</span> {salary.employee.position}
              </p>
            )}
            {salary.employee.cnpsNumber && (
              <p className="text-gray-700">
                <span className="font-semibold">N° CNPS:</span> {salary.employee.cnpsNumber}
              </p>
            )}
            {salary.employee.cnamNumber && (
              <p className="text-gray-700">
                <span className="font-semibold">N° CNAM:</span> {salary.employee.cnamNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase bg-blue-100 px-4 py-2">
          Détail de la rémunération
        </h3>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="text-left py-2 px-4 font-semibold text-gray-700">Libellé</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-700">Base</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-700">Taux</th>
              <th className="text-right py-2 px-4 font-semibold text-gray-700">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 text-gray-700 font-semibold">Salaire de base</td>
              <td className="text-right py-2 px-4 text-gray-700">-</td>
              <td className="text-right py-2 px-4 text-gray-700">-</td>
              <td className="text-right py-2 px-4 text-gray-700 font-semibold">
                {formatCurrency(salary.baseSalary)}
              </td>
            </tr>

            {salary.overtime && salary.overtime > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 text-gray-700">Heures supplémentaires</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">
                  {formatCurrency(salary.overtime)}
                </td>
              </tr>
            )}

            {salary.bonuses && salary.bonuses > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 text-gray-700">Primes</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">
                  {formatCurrency(salary.bonuses)}
                </td>
              </tr>
            )}

            {salary.allowances && salary.allowances > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 text-gray-700">Indemnités</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">-</td>
                <td className="text-right py-2 px-4 text-gray-700">
                  {formatCurrency(salary.allowances)}
                </td>
              </tr>
            )}

            <tr className="bg-blue-50 border-y-2 border-blue-300">
              <td className="py-2 px-4 font-bold text-gray-800" colSpan={3}>
                SALAIRE BRUT
              </td>
              <td className="text-right py-2 px-4 font-bold text-gray-800">
                {formatCurrency(calculateGrossSalary())}
              </td>
            </tr>

            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 text-gray-700">CNPS (Salarié)</td>
              <td className="text-right py-2 px-4 text-gray-700">
                {formatCurrency(salary.baseSalary)}
              </td>
              <td className="text-right py-2 px-4 text-gray-700">3,6%</td>
              <td className="text-right py-2 px-4 text-red-600">
                -{formatCurrency(calculateCNPS())}
              </td>
            </tr>

            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 text-gray-700">CNAM (Salarié)</td>
              <td className="text-right py-2 px-4 text-gray-700">
                {formatCurrency(salary.baseSalary)}
              </td>
              <td className="text-right py-2 px-4 text-gray-700">3,5%</td>
              <td className="text-right py-2 px-4 text-red-600">
                -{formatCurrency(calculateCNAM())}
              </td>
            </tr>

            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 text-gray-700">FDFP (Salarié)</td>
              <td className="text-right py-2 px-4 text-gray-700">
                {formatCurrency(salary.baseSalary)}
              </td>
              <td className="text-right py-2 px-4 text-gray-700">0,4%</td>
              <td className="text-right py-2 px-4 text-red-600">
                -{formatCurrency(calculateFDFP())}
              </td>
            </tr>

            {salary.deductions &&
              salary.deductions.map((deduction, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-4 text-gray-700">{deduction.label}</td>
                  <td className="text-right py-2 px-4 text-gray-700">-</td>
                  <td className="text-right py-2 px-4 text-gray-700">
                    {deduction.rate ? `${deduction.rate}%` : '-'}
                  </td>
                  <td className="text-right py-2 px-4 text-red-600">
                    -{formatCurrency(deduction.amount)}
                  </td>
                </tr>
              ))}

            <tr className="bg-red-50 border-y-2 border-red-300">
              <td className="py-2 px-4 font-bold text-gray-800" colSpan={3}>
                TOTAL RETENUES
              </td>
              <td className="text-right py-2 px-4 font-bold text-red-700">
                -{formatCurrency(calculateTotalDeductions())}
              </td>
            </tr>

            <tr className="bg-green-100 border-y-4 border-green-600">
              <td className="py-3 px-4 font-bold text-gray-900 text-lg" colSpan={3}>
                NET À PAYER
              </td>
              <td className="text-right py-3 px-4 font-bold text-green-700 text-lg">
                {formatCurrency(salary.netSalary)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <p className="text-xs text-gray-600 mb-1">Salaire brut</p>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(calculateGrossSalary())}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <p className="text-xs text-gray-600 mb-1">Total retenues</p>
          <p className="text-lg font-bold text-red-700">
            {formatCurrency(calculateTotalDeductions())}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <p className="text-xs text-gray-600 mb-1">Net à payer</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(salary.netSalary)}
          </p>
        </div>
      </div>

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
