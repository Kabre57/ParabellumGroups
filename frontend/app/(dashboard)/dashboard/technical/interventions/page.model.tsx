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
import MissionOrderPrint from '@/components/printComponents/MissionOrderPrint';
import { GenerateMissionOrderDialog } from '@/components/technical/GenerateMissionOrderDialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { isAdminRole } from '@/shared/permissions';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/confirm-dialog';

// État, chargement et actions du parcours d'interface.


export const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  ANNULEE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

export function useInterventionsPageModel() {

  const { user } = useAuth();
  const isAdmin = isAdminRole(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | undefined>();

  const [printingData, setPrintingData] = useState<{ type: 'rapport' | 'intervention'; data: any } | null>(null);
  const [printingOrder, setPrintingOrder] = useState<{ mission: any; technicien: any; missionOrder?: any; interventionTitle?: string } | null>(null);
  const [orderGenerationTarget, setOrderGenerationTarget] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: (() => void) | null;
    variant?: 'default' | 'destructive';
  }>({ open: false, title: '', description: '', action: null });

  const { data: interventions = [], isLoading } = useInterventions({ pageSize: 100 });
  const deleteMutation = useDeleteIntervention();
  const completeMutation = useCompleteIntervention();
  const { canCreate, canUpdate, canDelete, canExport, canApprove } = getCrudVisibility(user, {
    read: ['interventions.read', 'interventions.read_all', 'interventions.read_assigned'],
    create: ['interventions.create'],
    update: ['interventions.update', 'interventions.create_report'],
    remove: ['interventions.delete'],
    approve: ['interventions.complete'],
    export: ['interventions.create_report'],
  });

  const filteredInterventions = interventions.filter((intervention: Intervention) => {
    const matchesSearch =
      intervention.titre?.toLowerCase().includes(search.toLowerCase()) ||
      intervention.mission?.titre?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || intervention.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, force = false) => {
    setConfirmState({
      open: true,
      title: 'Supprimer cette intervention ?',
      description: 'Cette action est definitive et supprimera la fiche intervention.',
      variant: 'destructive',
      action: () => deleteMutation.mutate({ id, force }),
    });
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

  const handleMissionOrderPrint = async (intervention: Intervention) => {
    setIsFetching(`order:${intervention.id}`);
    try {
      const interventionResp = await technicalService.getIntervention(intervention.id);
      const fullIntervention = (interventionResp as any)?.data ?? interventionResp;
      const printableIntervention = fullIntervention?.data ?? fullIntervention ?? intervention;

      let printableMission = printableIntervention?.mission;
      if (printableIntervention?.missionId) {
        try {
          const missionResp = await technicalService.getMission(printableIntervention.missionId);
          const missionData = (missionResp as any)?.data ?? missionResp;
          printableMission = missionData?.data ?? missionData ?? printableMission;
        } catch (error) {
          console.error("Erreur chargement mission pour ordre:", error);
        }
      }

      const recipients = (printableIntervention?.techniciens || [])
        .map((assignment: any) => {
          const technicien = assignment?.technicien;
          if (!technicien?.id) return null;
          return {
            key: technicien.id,
            technicien,
            interventionTitle: assignment?.role || printableIntervention?.titre,
          };
        })
        .filter(Boolean) as Array<{ key: string; technicien: any; interventionTitle?: string }>;

      if (recipients.length === 0) {
        toast.error("Aucun technicien affecté à cette intervention. Affectez d'abord un technicien pour émettre l'ordre de mission.");
        return;
      }
      setOrderGenerationTarget({
        mission: printableMission || printableIntervention?.mission || intervention?.mission,
        intervention: printableIntervention,
        techniciens: printableIntervention?.techniciens || [],
      });
    } catch (error) {
      console.error("Erreur préparation ordre de mission:", error);
      toast.error("Impossible de préparer l'ordre de mission");
    } finally {
      setIsFetching(null);
    }
  };

  const handleComplete = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Marquer comme terminée ?',
      description: 'Cette intervention sera cloturee et sa mission pourra etre mise a jour.',
      action: () =>
        completeMutation.mutate({
          id,
          data: {
            dureeReelle: 0,
            resultats: 'Intervention terminée',
          },
        }),
    });
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
  return {
    user,
    isAdmin,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    selectedIntervention,
    setSelectedIntervention,
    printingData,
    setPrintingData,
    printingOrder,
    setPrintingOrder,
    orderGenerationTarget,
    setOrderGenerationTarget,
    isFetching,
    setIsFetching,
    confirmState,
    setConfirmState,
    interventions,
    isLoading,
    deleteMutation,
    completeMutation,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canApprove,
    filteredInterventions,
    handleDelete,
    handleCreate,
    handleEdit,
    handlePrint,
    handleMissionOrderPrint,
    handleComplete,
    formatDate,
    formatDuration,
  };
}
