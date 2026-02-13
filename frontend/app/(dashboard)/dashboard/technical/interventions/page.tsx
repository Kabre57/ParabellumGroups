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
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Interventions</h1>
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

      {/* TABLEAU AVEC SCROLL HORIZONTAL */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow no-print overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Intervention
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInterventions.map((intervention: Intervention) => (
                <tr key={intervention.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {intervention.titre}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white truncate max-w-[150px]">
                      {intervention.mission?.titre || '-'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {intervention.mission?.numeroMission || ''}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-xs text-gray-900 dark:text-white">
                      <span>{formatDate(intervention.dateDebut)}</span>
                      {intervention.dateFin && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatDate(intervention.dateFin)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                    <div>Est.: {formatDuration(intervention.dureeEstimee)}</div>
                    {intervention.dureeReelle && (
                      <div className="text-gray-500 dark:text-gray-400">
                        Réel: {formatDuration(intervention.dureeReelle)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={`${statusColors[intervention.status]} border-none font-normal text-[10px]`}>
                      {intervention.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {intervention.status !== 'TERMINEE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-green-600 hover:text-green-700 border-green-200"
                          onClick={() => handleComplete(intervention.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminer
                        </Button>
                      )}
                      <Link href={`/dashboard/technical/interventions/${intervention.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handlePrint(intervention)}
                        disabled={isFetching === intervention.id}
                        title="Imprimer l'intervention"
                      >
                        {isFetching === intervention.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleEdit(intervention)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700 border-red-200"
                        onClick={() => handleDelete(intervention.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
