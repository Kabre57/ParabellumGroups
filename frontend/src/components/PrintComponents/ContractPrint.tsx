'use client';

/* eslint-disable @next/next/no-img-element */

import React from 'react';

interface ContractPrintProps {
  contract: {
    id: string;
    type: 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
    employee: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      position?: string;
    };
    startDate: string;
    endDate?: string;
    salary?: number;
    workingHours?: string;
    benefits?: string;
    clauses?: string;
    createdAt: string;
  };
  onClose: () => void;
}

const contractTypeLabels: Record<string, string> = {
  CDI: 'Contrat à Durée Indéterminée',
  CDD: 'Contrat à Durée Déterminée',
  STAGE: 'Convention de Stage',
  FREELANCE: 'Contrat de Freelance',
};

export default function ContractPrint({ contract, onClose }: ContractPrintProps) {
  React.useEffect(() => {
    const handlePrint = () => {
      window.print();
      onClose();
    };
    const timer = setTimeout(handlePrint, 500);
    return () => clearTimeout(timer);
  }, [onClose]);

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

  return (
    <div className="print:block hidden">
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* En-tête */}
        <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-blue-600">
          <div>
            <img
              src="/parabellum.jpg"
              alt="Parabellum Logo"
              className="h-16 mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-blue-900">PARABELLUM GROUP</h1>
            <p className="text-sm text-gray-600 mt-2">
              IDU: CI-2019-0046392 R<br />
              CNPS: 1234567<br />
              Abidjan, Côte d'Ivoire
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {contractTypeLabels[contract.type] || contract.type}
            </h2>
            <p className="text-sm text-gray-600">
              N° {contract.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Date: {formatDate(contract.createdAt)}
            </p>
          </div>
        </div>

        {/* Parties contractantes */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">
            Entre les soussignés:
          </h3>

          {/* Employeur */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-700 mb-2">L'EMPLOYEUR:</h4>
            <div className="pl-4 space-y-1">
              <p className="text-gray-700">
                <span className="font-semibold">Raison sociale:</span> PARABELLUM GROUP
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">IDU:</span> CI-2019-0046392 R
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">N° CNPS:</span> 1234567
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Représentée par:</span> M. Koffi KOUASSI,
                Directeur Général
              </p>
            </div>
          </div>

          {/* Salarié */}
          <div>
            <h4 className="font-bold text-gray-700 mb-2">LE SALARIÉ:</h4>
            <div className="pl-4 space-y-1">
              <p className="text-gray-700">
                <span className="font-semibold">Nom et Prénom:</span>{' '}
                {contract.employee.lastName.toUpperCase()} {contract.employee.firstName}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Email:</span> {contract.employee.email}
              </p>
              {contract.employee.phone && (
                <p className="text-gray-700">
                  <span className="font-semibold">Téléphone:</span> {contract.employee.phone}
                </p>
              )}
              {contract.employee.address && (
                <p className="text-gray-700">
                  <span className="font-semibold">Adresse:</span> {contract.employee.address}
                </p>
              )}
              {contract.employee.position && (
                <p className="text-gray-700">
                  <span className="font-semibold">Poste:</span> {contract.employee.position}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Il a été convenu */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">
            Il a été convenu ce qui suit:
          </h3>

          <div className="space-y-4">
            {/* Article 1: Type et durée */}
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Article 1 - Type et durée du contrat</h4>
              <p className="pl-4 text-gray-700">
                Le présent contrat est un <strong>{contractTypeLabels[contract.type]}</strong>.
                <br />
                Date de début: <strong>{formatDate(contract.startDate)}</strong>
                {contract.endDate && (
                  <>
                    <br />
                    Date de fin: <strong>{formatDate(contract.endDate)}</strong>
                  </>
                )}
              </p>
            </div>

            {/* Article 2: Rémunération */}
            {contract.salary && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Article 2 - Rémunération</h4>
                <p className="pl-4 text-gray-700">
                  La rémunération brute mensuelle est fixée à{' '}
                  <strong>{formatCurrency(contract.salary)}</strong>.
                </p>
              </div>
            )}

            {/* Article 3: Horaires de travail */}
            {contract.workingHours && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Article 3 - Horaires de travail</h4>
                <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.workingHours}</p>
              </div>
            )}

            {/* Article 4: Avantages */}
            {contract.benefits && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">Article 4 - Avantages</h4>
                <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.benefits}</p>
              </div>
            )}

            {/* Article 5: Clauses particulières */}
            {contract.clauses && (
              <div>
                <h4 className="font-bold text-gray-700 mb-2">
                  Article 5 - Clauses particulières
                </h4>
                <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.clauses}</p>
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-bold text-gray-700 mb-16">L'EMPLOYEUR</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-600">Signature et cachet</p>
              </div>
            </div>
            <div>
              <p className="font-bold text-gray-700 mb-16">LE SALARIÉ</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm text-gray-600">Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mentions légales */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs text-gray-600">
            <strong>Mentions légales:</strong> Contrat établi conformément au Code du Travail de
            Côte d'Ivoire. En cas de litige, les parties s'engagent à rechercher une solution
            amiable avant toute procédure judiciaire.
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            font-family: 'Arial', sans-serif;
          }
          .no-print {
            display: none !important;
          }
          .border-blue-600 {
            border-color: #2563eb !important;
          }
        }
      `}</style>
    </div>
  );
}

