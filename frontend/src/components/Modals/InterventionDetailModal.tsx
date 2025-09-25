import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Package, 
  Play, 
  Square, 
  Edit,
  Plus,
  Trash2,
  User,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface InterventionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: any;
}

export const InterventionDetailModal: React.FC<InterventionDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  intervention 
}) => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');

  const assignTechnicienMutation = useMutation({
    mutationFn: ({ technicienId, role, commentaire }: { technicienId: number; role: string; commentaire?: string }) =>
      fetch(`/api/v1/interventions/${intervention.id}/assign-technicien`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ technicienId, role, commentaire })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    }
  });

  const removeTechnicienMutation = useMutation({
    mutationFn: (technicienId: number) =>
      fetch(`/api/v1/interventions/${intervention.id}/technicien/${technicienId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
    }
  });

  if (!isOpen || !intervention) return null;

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const handleRemoveTechnicien = async (technicienId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir retirer ce technicien de l\'intervention ?')) {
      try {
        await removeTechnicienMutation.mutateAsync(technicienId);
      } catch (error) {
        console.error('Erreur lors du retrait:', error);
      }
    }
  };

  const statusConfig = {
    planifiee: { label: 'Planifiée', color: 'bg-yellow-100 text-yellow-800' },
    en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    terminee: { label: 'Terminée', color: 'bg-green-100 text-green-800' },
    annulee: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
  };

  const statusInfo = statusConfig[intervention.statut as keyof typeof statusConfig] || statusConfig.planifiee;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Intervention #{intervention.id}
            </h3>
            <p className="text-sm text-gray-500">
              Mission: {intervention.mission?.numIntervention} - {intervention.mission?.client?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Détails', icon: FileText },
              { id: 'techniciens', label: 'Techniciens', icon: Users },
              { id: 'rapports', label: 'Rapports', icon: FileText },
              { id: 'materiel', label: 'Matériel', icon: Package }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-6 py-4">
          {/* Onglet Détails */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Informations Générales</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Début:</span>
                      <span className="font-medium">{new Date(intervention.dateHeureDebut).toLocaleString()}</span>
                    </div>
                    {intervention.dateHeureFin && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fin:</span>
                        <span className="font-medium">{new Date(intervention.dateHeureFin).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium">{formatDuration(intervention.duree)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Mission Associée</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">N° Mission:</span>
                      <span className="font-medium">{intervention.mission?.numIntervention}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{intervention.mission?.client?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nature:</span>
                      <span className="font-medium">{intervention.mission?.natureIntervention}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priorité:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        intervention.mission?.priorite === 'urgente' ? 'bg-red-100 text-red-800' :
                        intervention.mission?.priorite === 'haute' ? 'bg-orange-100 text-orange-800' :
                        intervention.mission?.priorite === 'normale' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {intervention.mission?.priorite || 'normale'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commentaire */}
              {intervention.commentaire && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Commentaire</h4>
                  <p className="text-sm text-gray-700">{intervention.commentaire}</p>
                </div>
              )}
            </div>
          )}

          {/* Onglet Techniciens */}
          {activeTab === 'techniciens' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Techniciens Assignés</h4>
                {hasPermission('interventions.update') && (
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center">
                    <Plus className="h-3 w-3 mr-1" />
                    Assigner
                  </button>
                )}
              </div>

              {intervention.techniciens?.length > 0 ? (
                <div className="space-y-3">
                  {intervention.techniciens.map((assignment: any) => (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.technicien.prenom} {assignment.technicien.nom}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Wrench className="h-3 w-3 mr-1" />
                              {assignment.technicien.specialite?.libelle}
                            </div>
                            <div className="text-xs text-gray-400">
                              {assignment.technicien.contact}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            assignment.role === 'responsable' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {assignment.role === 'responsable' ? 'Responsable' : 'Assistant'}
                          </span>
                          {hasPermission('interventions.update') && (
                            <button
                              onClick={() => handleRemoveTechnicien(assignment.technicien.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Retirer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {assignment.commentaire && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {assignment.commentaire}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Aucun technicien assigné</p>
                </div>
              )}
            </div>
          )}

          {/* Onglet Rapports */}
          {activeTab === 'rapports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Rapports de Mission</h4>
                {hasPermission('rapports.create') && (
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center">
                    <Plus className="h-3 w-3 mr-1" />
                    Nouveau Rapport
                  </button>
                )}
              </div>

              {intervention.rapports?.length > 0 ? (
                <div className="space-y-3">
                  {intervention.rapports.map((rapport: any) => (
                    <div key={rapport.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rapport.titre}</div>
                          <div className="text-sm text-gray-500">
                            Par {rapport.technicien?.prenom} {rapport.technicien?.nom}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(rapport.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          rapport.statut === 'valide' ? 'bg-green-100 text-green-800' :
                          rapport.statut === 'rejete' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {rapport.statut}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        {rapport.contenu.substring(0, 150)}
                        {rapport.contenu.length > 150 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Aucun rapport créé</p>
                </div>
              )}
            </div>
          )}

          {/* Onglet Matériel */}
          {activeTab === 'materiel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Matériel Utilisé</h4>
                {hasPermission('materiels.update') && (
                  <button className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 flex items-center">
                    <Plus className="h-3 w-3 mr-1" />
                    Sortie Matériel
                  </button>
                )}
              </div>

              {intervention.sortiesMateriels?.length > 0 ? (
                <div className="space-y-3">
                  {intervention.sortiesMateriels.map((sortie: any) => (
                    <div key={sortie.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Package className="h-8 w-8 text-orange-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sortie.materiel.designation}
                            </div>
                            <div className="text-sm text-gray-500">
                              Réf: {sortie.materiel.reference}
                            </div>
                            <div className="text-xs text-gray-400">
                              Sorti par {sortie.technicien?.prenom} {sortie.technicien?.nom}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Qté: {sortie.quantite}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(sortie.dateSortie).toLocaleDateString()}
                          </div>
                          {sortie.retourne && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Retourné
                            </span>
                          )}
                        </div>
                      </div>
                      {sortie.motif && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          <strong>Motif:</strong> {sortie.motif}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Aucun matériel utilisé</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div className="flex items-center space-x-3">
            {hasPermission('interventions.update') && intervention.statut === 'planifiee' && (
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Démarrer</span>
              </button>
            )}
            {hasPermission('interventions.update') && intervention.statut === 'en_cours' && (
              <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2">
                <Square className="h-4 w-4" />
                <span>Terminer</span>
              </button>
            )}
            {hasPermission('interventions.update') && (
              <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Modifier</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};