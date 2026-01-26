import React, { useEffect } from 'react';
import { Rapport, Intervention } from '@/shared/api/services/technical';

interface RapportPrintProps {
  rapport: Rapport & {
    intervention?: Intervention;
    redacteur?: {
      prenom: string;
      nom: string;
      matricule?: string;
    };
  };
  onClose: () => void;
}

export default function RapportPrint({ rapport, onClose }: RapportPrintProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      onClose();
    }, 500);

    return () => clearTimeout(timer);
  }, [onClose]);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="print-only">
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-8 bg-white">
        <div className="text-center mb-8 pb-4 border-b-2 border-blue-600">
          <img
            src="/parabellum.jpg"
            alt="Logo Parabellum"
            className="h-16 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-blue-900">PARABELLUM GROUP</h1>
          <p className="text-sm text-gray-600 mt-2">Service Technique - Division Interventions</p>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            RAPPORT D'INTERVENTION
          </h2>
          <p className="text-sm text-gray-600">Réf: {rapport.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase border-b pb-2">
              Informations Générales
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Titre:</span>
                <p className="ml-4 text-gray-700">{rapport.titre}</p>
              </div>
              <div>
                <span className="font-semibold">Date de création:</span>
                <p className="ml-4 text-gray-700">{formatDate(rapport.dateCreation)}</p>
              </div>
              <div>
                <span className="font-semibold">Statut:</span>
                <p className="ml-4 text-gray-700">{rapport.status}</p>
              </div>
              {rapport.dateValidation && (
                <div>
                  <span className="font-semibold">Validé le:</span>
                  <p className="ml-4 text-gray-700">{formatDate(rapport.dateValidation)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase border-b pb-2">
              Rédacteur
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Nom:</span>
                <p className="ml-4 text-gray-700">
                  {rapport.redacteur
                    ? `${rapport.redacteur.prenom} ${rapport.redacteur.nom}`
                    : 'Non spécifié'}
                </p>
              </div>
              {rapport.redacteur?.matricule && (
                <div>
                  <span className="font-semibold">Matricule:</span>
                  <p className="ml-4 text-gray-700">{rapport.redacteur.matricule}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {rapport.intervention && (
          <div className="border rounded-lg p-4 mb-8 bg-blue-50">
            <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase border-b pb-2 border-blue-200">
              Intervention Concernée
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Titre:</span>
                <p className="ml-4 text-gray-700">{rapport.intervention.titre}</p>
              </div>
              {rapport.intervention.description && (
                <div>
                  <span className="font-semibold">Description:</span>
                  <p className="ml-4 text-gray-700">{rapport.intervention.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Date début:</span>
                  <p className="ml-4 text-gray-700">{formatDate(rapport.intervention.dateDebut)}</p>
                </div>
                {rapport.intervention.dateFin && (
                  <div>
                    <span className="font-semibold">Date fin:</span>
                    <p className="ml-4 text-gray-700">{formatDate(rapport.intervention.dateFin)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg p-6 mb-8">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase border-b pb-2">
            Contenu du Rapport
          </h3>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {rapport.contenu}
            </div>
          </div>
        </div>

        {rapport.conclusions && (
          <div className="border rounded-lg p-6 mb-8 bg-green-50">
            <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase border-b pb-2 border-green-200">
              Conclusions
            </h3>
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {rapport.conclusions}
            </div>
          </div>
        )}

        {rapport.recommandations && (
          <div className="border rounded-lg p-6 mb-8 bg-yellow-50">
            <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase border-b pb-2 border-yellow-200">
              Recommandations
            </h3>
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {rapport.recommandations}
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-bold mb-16">Le Rédacteur</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm">Signature</p>
                {rapport.redacteur && (
                  <p className="text-xs text-gray-600 mt-1">
                    {rapport.redacteur.prenom} {rapport.redacteur.nom}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="font-bold mb-16">Le Responsable Technique</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm">Signature et cachet</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <p>
            <strong>Document confidentiel</strong> - Ce rapport d'intervention est la propriété de
            PARABELLUM GROUP et ne peut être reproduit ou communiqué à des tiers sans autorisation
            expresse.
          </p>
          <p className="mt-2">
            Généré le {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
