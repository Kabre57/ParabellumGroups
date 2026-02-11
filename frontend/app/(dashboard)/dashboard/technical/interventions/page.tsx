'use client';

import React, { useState } from 'react';
import { useInterventions, useDeleteIntervention, useCompleteIntervention } from '@/hooks/useTechnical';
import { Intervention, technicalService } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, CheckCircle, Clock, FileText, Printer, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CreateInterventionModal } from '@/components/technical/CreateInterventionModal';
import RapportPrint from '@/components/printComponents/RapportPrint';
import InterventionPrint from '@/components/printComponents/InterventionPrint';

const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  ANNULEE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

export default function InterventionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | undefined>();
  
  // États pour l'impression (rapport ou intervention)
  const [printingData, setPrintingData] = useState<{ type: 'rapport' | 'intervention'; data: any } | null>(null);
  const [isFetching, setIsFetching] = useState<string | null>(null);

  const { data: interventions = [], isLoading } = useInterventions({ pageSize: 100 });
  const deleteMutation = useDeleteIntervention();
  const completeMutation = useCompleteIntervention();

  const filteredInterventions = interventions.filter((intervention: Intervention) => {
    const matchesSearch =
      intervention.titre?.toLowerCase().includes(search.toLowerCase()) ||
      intervention.mission?.titre?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || intervention.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedIntervention(undefined);
    setShowCreateModal(true);
  };

  const handleEdit = (item: Intervention) => {
    setSelectedIntervention(item);
    setShowEditModal(true);
  };

  const handlePrint = async (intervention: Intervention) => {
    setIsFetching(intervention.id);
    try {
      const interventionResp = await technicalService.getIntervention(intervention.id);
      let fullIntervention = (interventionResp as any)?.data ?? interventionResp;

      if (!fullIntervention?.mission && fullIntervention?.missionId) {
        try {
          const missionResp = await technicalService.getMission(fullIntervention.missionId);
          const mission = (missionResp as any)?.data ?? missionResp;
          fullIntervention = { ...fullIntervention, mission: mission?.data ?? mission };
        } catch (error) {
          console.error('Erreur chargement mission pour impression:', error);
        }
      }

      const rapports = Array.isArray(fullIntervention?.rapports) ? fullIntervention.rapports : [];
      if (rapports.length > 0) {
        const rapportId = rapports[rapports.length - 1]?.id;
        if (rapportId) {
          const rapportResp = await technicalService.getRapport(rapportId);
          const fullRapport = (rapportResp as any)?.data ?? rapportResp;
          if (fullRapport) {
            setPrintingData({ type: 'rapport', data: fullRapport });
            return;
          }
        }
      }

      setPrintingData({ type: 'intervention', data: fullIntervention || intervention });
    } catch (error) {
      console.error("Erreur chargement impression intervention:", error);
      setPrintingData({ type: 'intervention', data: intervention });
    } finally {
      setIsFetching(null);
    }
  };

  const handleComplete = (id: string) => {
    if (confirm('Marquer cette intervention comme terminée ?')) {
      completeMutation.mutate({
        id,
        data: {
          dureeReelle: 0,
          resultats: 'Intervention terminée',
        },
      });
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {printingData?.type === 'rapport' && (
        <RapportPrint
          rapport={printingData.data}
          onClose={() => setPrintingData(null)}
        />
      )}
      {printingData?.type === 'intervention' && (
        <InterventionPrint
          intervention={printingData.data}
          onClose={() => setPrintingData(null)}
        />
      )}

      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interventions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Suivi des interventions techniques
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Nouvelle Intervention
        </Button>
      </div>

      <CreateInterventionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <CreateInterventionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedIntervention(undefined);
        }}
        missionId={selectedIntervention?.missionId}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 no-print">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par titre ou mission..."
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden no-print">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Intervention
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Durée
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredInterventions.map((intervention: Intervention) => (
              <tr key={intervention.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {intervention.titre}
                      </div>
                      {intervention.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {intervention.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {intervention.mission?.titre || '-'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {intervention.mission?.numeroMission || ''}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900 dark:text-white">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    <div>
                      <div>{formatDate(intervention.dateDebut)}</div>
                      {intervention.dateFin && (
                        <div className="text-gray-500 dark:text-gray-400">
                          {formatDate(intervention.dateFin)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>Estimée: {formatDuration(intervention.dureeEstimee)}</div>
                  {intervention.dureeReelle && (
                    <div className="text-gray-500 dark:text-gray-400">
                      Réelle: {formatDuration(intervention.dureeReelle)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={statusColors[intervention.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}>
                    {intervention.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {intervention.status !== 'TERMINEE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleComplete(intervention.id)}
                        disabled={completeMutation.isPending}
                        className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Terminer
                      </Button>
                    )}
                    <Link href={`/dashboard/technical/interventions/${intervention.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Voir
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEdit(intervention)}>
                      <Edit className="w-3 h-3" />
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      title="Imprimer"
                      onClick={() => handlePrint(intervention)}
                      disabled={isFetching === intervention.id}
                    >
                      {isFetching === intervention.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Printer className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(intervention.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInterventions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg no-print">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune intervention trouvée</p>
          <Link href="/dashboard/technical/interventions/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer la première intervention
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
