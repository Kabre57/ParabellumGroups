'use client';

import React, { useState } from 'react';
import { useMissions, useDeleteMission, useUpdateMissionStatus, useCreateMission, useUpdateMission } from '@/hooks/useTechnical';
import { Mission } from '@/shared/api/services/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Users, FileText, Calendar, MapPin, Printer } from 'lucide-react';
import Link from 'next/link';
import { MissionForm } from '@/components/technical/MissionForm';
import { CreateMissionModal } from '@/components/technical/CreateMissionModal';

const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  ANNULEE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

const prioriteColors: Record<string, string> = {
  FAIBLE: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  MOYENNE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  HAUTE: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  URGENTE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

export default function MissionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | undefined>();

  const { data: missions = [], isLoading, error } = useMissions({ pageSize: 100 });
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
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedMission(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: Mission) => {
    setSelectedMission(item);
    setShowForm(true);
  };

  const handleSubmit = (data: Partial<Mission>) => {
    if (selectedMission) {
      updateMutation.mutate({ id: selectedMission.id, data }, {
        onSuccess: () => {
          setShowForm(false);
          setSelectedMission(undefined);
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setShowForm(false);
        }
      });
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
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

      <CreateMissionModal
        isOpen={showForm && !selectedMission}
        onClose={() => setShowForm(false)}
      />

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMissions.map((mission: Mission) => (
          <div
            key={mission.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {mission.titre}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {mission.numeroMission}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[mission.status] || 'bg-gray-100 text-gray-800'}>
                  {mission.status}
                </Badge>
                <Badge className={prioriteColors[mission.priorite] || 'bg-gray-100 text-gray-800'}>
                  {mission.priorite}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{mission.clientNom}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{mission.adresse}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(mission.dateDebut)}
                  {mission.dateFin && ` - ${formatDate(mission.dateFin)}`}
                </span>
              </div>
              {mission.budgetEstime && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>Budget: {formatCurrency(mission.budgetEstime)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/dashboard/technical/missions/${mission.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" />
                  Voir
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEdit(mission)}>
                <Edit className="w-3 h-3" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" title="Imprimer">
                <Printer className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(mission.id)}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredMissions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune mission trouvée</p>
          <Link href="/dashboard/technical/missions/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer la première mission
            </Button>
          </Link>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <MissionForm
          item={selectedMission}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedMission(undefined);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
