import React from 'react';

interface ContractPrintProps {
  contract: any;
  onClose: () => void;
}

// Ajoutez cette constante avant le composant
const contractTypeLabels = {
  CDI: 'Contrat à Durée Indéterminée',
  CDD: 'Contrat à Durée Déterminée',
  STAGE: 'Convention de Stage',
  FREELANCE: 'Contrat de Freelance'
};

export const ContractPrint: React.FC<ContractPrintProps> = ({ contract, onClose }) => {
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
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  return (
    <div className="print:block hidden">
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* En-tête avec logo */}
        <div className="flex items-center justify-between mb-8 border-b-2 border-blue-600 pb-6">
          <div className="flex items-center space-x-4">
            <img 
              src="/parrabellum.jpg" 
              alt="Parabellum Groups" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">PARABELLUM GROUPS</h1>
              <p className="text-gray-600">Solution technique innovante</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Abidjan, Côte d'Ivoire</p>
                <p>+225 07 07 07 07 07</p>
                <p>contact@parabellum.com</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800">CONTRAT DE TRAVAIL</h2>
            <div className="text-lg font-semibold text-gray-600 mt-2">
              {contract.contractType === 'CDI' ? 'Contrat à Durée Indéterminée' :
               contract.contractType === 'CDD' ? 'Contrat à Durée Déterminée' :
               contract.contractType === 'STAGE' ? 'Convention de Stage' :
               'Contrat de Freelance'}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Établi le {formatDate(new Date())}
            </div>
          </div>
        </div>

        {/* Parties contractantes */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              L'EMPLOYEUR
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Raison sociale :</strong> Parabellum Groups SARL</p>
              <p><strong>Siège social :</strong> Abidjan, Côte d'Ivoire</p>
              <p><strong>SIRET :</strong> CI-123456789</p>
              <p><strong>N° CNPS :</strong> 1234567</p>
              <p><strong>Représenté par :</strong> M. Koffi KOUASSI, Directeur Général</p>
              <p><strong>Ci-après dénommé :</strong> "L'Employeur"</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              LE SALARIÉ
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Nom et Prénom :</strong> {contract.employee.firstName} {contract.employee.lastName}</p>
              <p><strong>Date de naissance :</strong> {formatDate(contract.employee.dateOfBirth)}</p>
              <p><strong>Lieu de naissance :</strong> {contract.employee.placeOfBirth || 'Non renseigné'}</p>
              <p><strong>Nationalité :</strong> {contract.employee.nationality || 'Ivoirienne'}</p>
              <p><strong>Adresse :</strong> {contract.employee.address || 'Non renseignée'}</p>
              <p><strong>N° CNPS :</strong> {contract.employee.cnpsNumber || 'À attribuer'}</p>
              <p><strong>Ci-après dénommé :</strong> "Le Salarié"</p>
            </div>
          </div>
        </div>

        {/* Conditions du contrat */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
            CONDITIONS DU CONTRAT
          </h3>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Type de contrat :</span>
                <span>{contractTypeLabels[contract.contractType as keyof typeof contractTypeLabels]}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Date de prise d'effet :</span>
                <span>{formatDate(contract.startDate)}</span>
              </div>
              {contract.endDate && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="font-medium">Date de fin :</span>
                  <span>{formatDate(contract.endDate)}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Poste occupé :</span>
                <span>{contract.employee.position}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Service :</span>
                <span>{contract.employee.service?.name}</span>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Salaire de base :</span>
                <span className="font-bold text-green-600">{formatCurrency(contract.baseSalary)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Heures de travail :</span>
                <span>{contract.workingHours}h/semaine</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Période d'essai :</span>
                <span>{contract.contractType === 'CDI' ? '3 mois' : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="font-medium">Préavis :</span>
                <span>{contract.contractType === 'CDI' ? '1 mois' : 'Selon durée'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Avantages */}
        {contract.benefits && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              AVANTAGES ET BÉNÉFICES
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              {contract.benefits}
            </div>
          </div>
        )}

        {/* Clauses particulières */}
        {contract.terms && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              CLAUSES PARTICULIÈRES
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              {contract.terms}
            </div>
          </div>
        )}

        {/* Clauses standard */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
            CLAUSES GÉNÉRALES
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">Article 1 - Fonctions</h4>
              <p>Le salarié s'engage à exercer les fonctions de <strong>{contract.employee.position}</strong> au sein du service <strong>{contract.employee.service?.name}</strong>.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Article 2 - Lieu de travail</h4>
              <p>Le lieu de travail est fixé au siège social de l'entreprise à Abidjan, Côte d'Ivoire. L'employeur se réserve le droit de modifier ce lieu en fonction des nécessités du service.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Article 3 - Horaires</h4>
              <p>La durée hebdomadaire de travail est fixée à <strong>{contract.workingHours} heures</strong>, réparties selon les besoins du service et dans le respect de la législation en vigueur.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Article 4 - Rémunération</h4>
              <p>Le salaire mensuel brut est fixé à <strong>{formatCurrency(contract.baseSalary)}</strong>, payable mensuellement à terme échu.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Article 5 - Congés</h4>
              <p>Le salarié bénéficie des congés payés conformément à la législation ivoirienne, soit 2,5 jours ouvrables par mois de service effectif.</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Article 6 - Confidentialité</h4>
              <p>Le salarié s'engage à respecter la confidentialité des informations de l'entreprise et de ses clients, pendant et après l'exécution du présent contrat.</p>
            </div>
            
            {contract.contractType === 'CDI' && (
              <div>
                <h4 className="font-medium mb-2">Article 7 - Période d'essai</h4>
                <p>Le présent contrat est conclu sous réserve d'une période d'essai de trois (3) mois, renouvelable une fois.</p>
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <p className="font-medium mb-8">L'EMPLOYEUR</p>
            <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">M. Koffi KOUASSI</p>
            <p className="text-sm text-gray-600">Directeur Général</p>
            <p className="text-xs text-gray-500 mt-2">Date et signature</p>
          </div>
          <div className="text-center">
            <p className="font-medium mb-8">LE SALARIÉ</p>
            <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">{contract.employee.firstName} {contract.employee.lastName}</p>
            <p className="text-xs text-gray-500 mt-2">Lu et approuvé, date et signature</p>
          </div>
        </div>

        {/* Mentions légales */}
        <div className="border-t border-gray-400 pt-4 text-center text-xs text-gray-600 space-y-1">
          <p className="font-medium">
            Contrat établi en deux exemplaires originaux conformément au Code du Travail de Côte d'Ivoire
          </p>
          <p>
            Document généré électroniquement le {formatDate(new Date())} par le système Parabellum Groups
          </p>
          <div className="flex justify-center space-x-8 mt-2">
            <span>CNPS Employeur : 1234567</span>
            <span>SIRET : CI-123456789</span>
          </div>
        </div>
      </div>

      {/* Styles d'impression */}
      <style>{`
        @media print {
          body { 
            margin: 0; 
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
          .border-blue-600 { border-color: #2563eb !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-green-600 { color: #16a34a !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .border-gray-200 { border-color: #e5e7eb !important; }
          .border-gray-300 { border-color: #d1d5db !important; }
          .border-gray-400 { border-color: #9ca3af !important; }
        }
      `}</style>
    </div>
  );
};