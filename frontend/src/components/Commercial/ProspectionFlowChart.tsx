import React from 'react';
import { 
  Target, 
  Search, 
  Phone, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  ArrowDown,
  RotateCcw
} from 'lucide-react';

export const ProspectionFlowChart: React.FC = () => {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full p-6">
        {/* Phase 1 : Préparation */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 text-center max-w-md">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-bold text-blue-900">Phase 1 : Préparation</h3>
            <p className="text-sm text-blue-700 mt-1">
              Définition de la Cible &<br />Préparation des Outils
            </p>
          </div>
          <ArrowDown className="h-6 w-6 text-gray-400 my-4" />
        </div>

        {/* Phase 2 : Recherche & Qualification */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 max-w-4xl">
            <h3 className="font-bold text-yellow-900 text-center mb-4">Phase 2 : Recherche & Qualification</h3>
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <Search className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Identification</div>
                <div className="text-xs text-gray-600">Création de la liste</div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <FileText className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Qualification</div>
                <div className="text-xs text-gray-600">Questions clés BANT</div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <Target className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-sm font-medium">Priorisation</div>
                <div className="text-xs text-gray-600">Score A-B-C</div>
              </div>
            </div>
          </div>
          <ArrowDown className="h-6 w-6 text-gray-400 my-4" />
        </div>

        {/* Phase 3 : Prise de Contact */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-6 text-center max-w-md">
            <Phone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-bold text-purple-900">Phase 3 : Prise de Contact</h3>
            <p className="text-sm text-purple-700 mt-1">
              Email & Phoning<br />
              <strong>Objectif: Fixer un RDV</strong>
            </p>
          </div>
          <ArrowDown className="h-6 w-6 text-gray-400 my-4" />
        </div>

        {/* Décision : Contact Réussi ? */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
            <h3 className="font-bold text-gray-900">Contact Réussi ?</h3>
          </div>
          
          <div className="flex items-center justify-center space-x-12 mt-6">
            {/* Branche OUI */}
            <div className="flex flex-col items-center">
              <div className="bg-green-100 border border-green-300 rounded px-3 py-1 text-green-800 font-medium">
                OUI
              </div>
              <ArrowDown className="h-6 w-6 text-green-400 my-4" />
              <div className="bg-indigo-100 border-2 border-indigo-300 rounded-lg p-6 text-center max-w-md">
                <Calendar className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-bold text-indigo-900">Phase 4 : Entretien Découverte</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Écoute active & Diagnostic<br />
                  <strong>Objectif: Comprendre le besoin</strong>
                </p>
              </div>
            </div>

            {/* Branche NON */}
            <div className="flex flex-col items-center">
              <div className="bg-red-100 border border-red-300 rounded px-3 py-1 text-red-800 font-medium">
                NON
              </div>
              <ArrowDown className="h-6 w-6 text-red-400 my-4" />
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center max-w-sm">
                <RotateCcw className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <h4 className="font-medium text-red-900">Retour en Phase 2</h4>
                <p className="text-xs text-red-700">
                  Nouvelle tentative plus tard<br />
                  ou passage au prospect suivant
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Suite du workflow pour la branche OUI */}
        <div className="flex flex-col items-center mb-8">
          <ArrowDown className="h-6 w-6 text-gray-400 my-4" />
          
          {/* Décision : Besoin & Budget identifiés ? */}
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
            <h3 className="font-bold text-gray-900">Besoin & Budget identifiés ?</h3>
          </div>
          
          <div className="flex items-center justify-center space-x-12 mt-6">
            {/* Branche OUI */}
            <div className="flex flex-col items-center">
              <div className="bg-green-100 border border-green-300 rounded px-3 py-1 text-green-800 font-medium">
                OUI
              </div>
              <ArrowDown className="h-6 w-6 text-green-400 my-4" />
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-6 text-center max-w-md">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-bold text-green-900">Phase 5 : Proposition & Conclusion</h3>
                <p className="text-sm text-green-700 mt-1">
                  Présentation de l'offre<br />
                  Réponse aux objections<br />
                  <strong>Objectif: Signature</strong>
                </p>
              </div>
            </div>

            {/* Branche NON */}
            <div className="flex flex-col items-center">
              <div className="bg-red-100 border border-red-300 rounded px-3 py-1 text-red-800 font-medium">
                NON
              </div>
              <ArrowDown className="h-6 w-6 text-red-400 my-4" />
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center max-w-sm">
                <RotateCcw className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <h4 className="font-medium text-red-900">Retour en Phase 4</h4>
                <p className="text-xs text-red-700">
                  Approfondir les questions<br />
                  ou qualification en 'non-chaud'
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conclusion finale */}
        <div className="flex flex-col items-center">
          <ArrowDown className="h-6 w-6 text-gray-400 my-4" />
          
          {/* Décision finale */}
          <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
            <h3 className="font-bold text-gray-900">Conclusion ?</h3>
          </div>
          
          <div className="flex items-center justify-center space-x-12 mt-6">
            {/* Signature */}
            <div className="flex flex-col items-center">
              <div className="bg-green-100 border border-green-300 rounded px-3 py-1 text-green-800 font-medium">
                SIGNATURE
              </div>
              <ArrowDown className="h-6 w-6 text-green-400 my-4" />
              <div className="bg-green-200 border-2 border-green-400 rounded-lg p-6 text-center max-w-md">
                <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-green-900 text-lg">🎉 Prospect converti en Client !</h3>
                <p className="text-sm text-green-700 mt-2">
                  Transfert vers le processus de livraison
                </p>
              </div>
            </div>

            {/* Refus */}
            <div className="flex flex-col items-center">
              <div className="bg-red-100 border border-red-300 rounded px-3 py-1 text-red-800 font-medium">
                REFUS
              </div>
              <ArrowDown className="h-6 w-6 text-red-400 my-4" />
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center max-w-sm">
                <RotateCcw className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <h4 className="font-medium text-red-900">Retour en Phase 2</h4>
                <p className="text-xs text-red-700">
                  Analyse de l'échec<br />
                  Nurturing pour plus tard
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Légende */}
        <div className="mt-12 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Légende du Workflow</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-800 mb-2">Critères de Qualification BANT :</h5>
              <ul className="space-y-1 text-gray-600">
                <li><strong>Budget</strong> : Le prospect a-t-il les moyens ?</li>
                <li><strong>Authority</strong> : Parle-t-on au décideur ?</li>
                <li><strong>Need</strong> : Y a-t-il un besoin réel ?</li>
                <li><strong>Timeline</strong> : Quel est le timing ?</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-800 mb-2">Priorisation A-B-C :</h5>
              <ul className="space-y-1 text-gray-600">
                <li><strong>A (Chaud)</strong> : Besoin urgent + budget confirmé</li>
                <li><strong>B (Tiède)</strong> : Intérêt mais timing incertain</li>
                <li><strong>C (Froid)</strong> : Veille ou nurturing long terme</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};