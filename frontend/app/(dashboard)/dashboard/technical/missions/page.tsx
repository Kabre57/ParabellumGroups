'use client';

import React, { useState } from 'react';
import { useMissions, useDeleteMission, useUpdateMissionStatus, useCreateMission, useUpdateMission } from '@/hooks/useTechnical';
import { Mission, technicalService } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Calendar, MapPin, Printer, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MissionForm } from '@/components/technical/MissionForm';
import { CreateMissionModal } from '@/components/technical/CreateMissionModal';
import { toast } from 'sonner';
import MissionPrint from '@/components/printComponents/MissionPrint';

const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ANNULEE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const prioriteColors: Record<string, string> = {
  BASSE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  MOYENNE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  HAUTE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function MissionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | undefined>();
  const [printingMission, setPrintingMission] = useState<Mission | null>(null);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);

  const { data: missions = [], isLoading, error, refetch } = useMissions({ pageSize: 100 });
  const deleteMutation = useDeleteMission();
  const updateStatusMutation = useUpdateMissionStatus();
  const createMutation = useCreateMission();
  const updateMutation = useUpdateMission();

  const filteredMissions = missions.filter((mission: Mission) => {
    const matchesSearch =
      mission.titre?.toLowerCase().includes(search.toLowerCase()) ||
      mission.numeroMission?.toLowerCase().includes(search.toLowerCase()) ||
      mission.clientNom?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || mission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Mission supprimée avec succès');
          refetch();
        },
        onError: (error) => {
          toast.error('Erreur lors de la suppression de la mission');
          console.error('Erreur suppression:', error);
        }
      });
    }
  };

  const handleCreate = () => {
    setSelectedMission(undefined);
    setShowForm(true);
  };

  const handleEdit = (mission: Mission) => {
    console.log('Édition de la mission:', mission);
    setSelectedMission(mission);
    setShowForm(true);
  };

  const handleSubmit = (data: Partial<Mission>) => {
    console.log('HandleSubmit data reçu:', data);
    
    if (selectedMission) {
      // Édition
      updateMutation.mutate({ 
        id: selectedMission.id, 
        data: {
          ...data,
          budgetEstime: data.budgetEstime ? Number(data.budgetEstime) : undefined,
          priorite: data.priorite || 'MOYENNE'
        }
      }, {
        onSuccess: () => {
          toast.success('Mission mise à jour avec succès');
          setShowForm(false);
          setSelectedMission(undefined);
          refetch();
        },
        onError: (error) => {
          console.error('Erreur détaillée mise à jour mission:', error);
          toast.error('Erreur lors de la mise à jour de la mission');
        }
      });
    } else {
      // Création (ne devrait pas arriver avec notre configuration)
      console.warn('Création via MissionForm - devrait utiliser CreateMissionModal');
      createMutation.mutate({
        ...data,
        budgetEstime: data.budgetEstime ? Number(data.budgetEstime) : undefined,
        priorite: data.priorite || 'MOYENNE'
      }, {
        onSuccess: () => {
          toast.success('Mission créée avec succès');
          setShowForm(false);
          refetch();
        },
        onError: (error) => {
          console.error('Erreur détaillée création mission:', error);
          toast.error('Erreur lors de la création de la mission');
        }
      });
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status }, {
      onSuccess: () => {
        toast.success('Statut mis à jour');
        refetch();
      },
      onError: (error) => {
        toast.error('Erreur lors du changement de statut');
        console.error('Erreur statut:', error);
      }
    });
  };

  const handlePrint = async (mission: Mission) => {
    setIsPrinting(mission.id);
    try {
      const missionResp = await technicalService.getMission(mission.id);
      const fullMission = (missionResp as any)?.data ?? missionResp;
      setPrintingMission(fullMission?.data ?? fullMission ?? mission);
    } catch (error) {
      console.error('Erreur impression mission:', error);
      setPrintingMission(mission);
    } finally {
      setIsPrinting(null);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des missions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Erreur lors du chargement des missions</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          <p className="text-xs text-gray-500 mt-2">Vérifiez que le service Technical backend est démarré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {printingMission && (
        <MissionPrint
          mission={printingMission}
          onClose={() => setPrintingMission(null)}
        />
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Missions Techniques</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des missions et affectations
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Nouvelle Mission
        </Button>
      </div>

      {/* MODAL POUR LA CRÉATION */}
      <CreateMissionModal
        isOpen={showForm && !selectedMission}
        onClose={() => {
          setShowForm(false);
          setSelectedMission(undefined);
        }}
      />

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par titre, numéro ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANIFIEE">Planifiée</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINEE">Terminée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </div>

      {/* Tableau des missions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  N° Mission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMissions.map((mission: Mission) => (
                <tr 
                  key={mission.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mission.numeroMission}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mission.titre}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {mission.description ? (
                        <span className="truncate max-w-xs inline-block">
                          {mission.description.substring(0, 50)}...
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {mission.clientNom}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {mission.clientContact || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white flex items-start">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate max-w-xs">{mission.adresse}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {formatDate(mission.dateDebut)}
                    </div>
                    {mission.dateFin && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        → {formatDate(mission.dateFin)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(mission.budgetEstime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${statusColors[mission.status]} px-2 py-1 rounded-full text-xs font-medium`}>
                      {mission.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${prioriteColors[mission.priorite]} px-2 py-1 rounded-full text-xs font-medium`}>
                      {mission.priorite}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/technical/missions/${mission.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Voir
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Imprimer"
                        onClick={() => handlePrint(mission)}
                        disabled={isPrinting === mission.id}
                      >
                        {isPrinting === mission.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Printer className="w-3 h-3" />
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleEdit(mission)}
                      >
                        <Edit className="w-3 h-3" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(mission.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {/* Sélecteur de statut rapide */}
                    <div className="mt-2">
                      <select
                        value={mission.status}
                        onChange={(e) => handleStatusChange(mission.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-transparent border-gray-300 dark:border-gray-600"
                      >
                        <option value="PLANIFIEE">Planifiée</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINEE">Terminée</option>
                        <option value="ANNULEE">Annulée</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMissions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {search || statusFilter ? 'Aucune mission ne correspond à votre recherche' : 'Aucune mission trouvée'}
              </p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Créer la première mission
              </Button>
            </div>
          )}
        </div>

        {/* Résumé */}
        {filteredMissions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Affichage de {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Planifiée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">En cours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Terminée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Annulée</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FORMULAIRE POUR L'ÉDITION (MissionForm) */}
      {showForm && selectedMission && (
        <MissionForm
          item={selectedMission}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedMission(undefined);
          }}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}
