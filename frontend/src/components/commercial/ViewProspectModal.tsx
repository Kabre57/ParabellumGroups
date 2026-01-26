'use client';

import { X, Building2, User, Mail, Phone, Globe, MapPin, Calendar, TrendingUp } from 'lucide-react';
import type { Prospect } from '@/shared/api/types';

interface ViewProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

export default function ViewProspectModal({ isOpen, onClose, prospect }: ViewProspectModalProps) {
  if (!isOpen || !prospect) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Non définie';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Détails du prospect</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Informations de l'entreprise */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                  Informations de l'entreprise
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nom de l'entreprise</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Secteur</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.sector || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Site web</p>
                    {prospect.website ? (
                      <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center">
                        <Globe className="h-3 w-3 mr-1" />
                        {prospect.website}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">Non spécifié</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Effectif</p>
                    <p className="text-sm font-medium text-gray-900">
                      {prospect.employees ? `${prospect.employees} employés` : 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Chiffre d'affaires</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(prospect.revenue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact principal */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2 text-purple-600" />
                  Contact principal
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nom</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.contactName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Poste</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.position || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    {prospect.email ? (
                      <a href={`mailto:${prospect.email}`} className="text-sm text-blue-600 hover:underline flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {prospect.email}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">Non spécifié</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                    {prospect.phone ? (
                      <a href={`tel:${prospect.phone}`} className="text-sm text-blue-600 hover:underline flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {prospect.phone}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">Non spécifié</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Adresse */}
              {(prospect.address || prospect.city || prospect.postalCode) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-green-600" />
                    Adresse
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">
                      {prospect.address && <span>{prospect.address}<br /></span>}
                      {prospect.postalCode} {prospect.city}<br />
                      {prospect.country}
                    </p>
                  </div>
                </div>
              )}

              {/* Informations commerciales */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  Informations commerciales
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Étape actuelle</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.stage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Priorité</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      prospect.priority === 'A' ? 'bg-red-100 text-red-800' :
                      prospect.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {prospect.priority === 'A' ? 'Haute' : prospect.priority === 'B' ? 'Moyenne' : 'Basse'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Score</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.score}/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.source || 'Non spécifiée'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Valeur potentielle</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(prospect.potentialValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Probabilité de closing</p>
                    <p className="text-sm font-medium text-gray-900">
                      {prospect.closingProbability ? `${prospect.closingProbability}%` : 'Non définie'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date de closing estimée</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(prospect.estimatedCloseDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Créé le</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(prospect.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {prospect.tags && prospect.tags.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {prospect.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {prospect.notes && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Notes</h4>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.notes}</p>
                  </div>
                </div>
              )}

              {/* Activités récentes */}
              {prospect.activities && prospect.activities.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Activités récentes</h4>
                  <div className="space-y-2">
                    {prospect.activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="bg-gray-50 p-3 rounded border-l-2 border-blue-400">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                          <span className="text-xs text-gray-500">{formatDate(activity.createdAt)}</span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
