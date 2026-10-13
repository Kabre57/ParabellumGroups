'use client';

import React, { useState } from 'react';
import { useMissions, useDeleteMission, useUpdateMissionStatus, useResyncMissionFromCrm } from '@/hooks/useTechnical';
import { Mission, technicalService } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Calendar, MapPin, Printer, Loader2, FileText, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { CreateMissionModal } from '@/components/technical/CreateMissionModal';
import { toast } from 'sonner';
import MissionOrderPrint from '@/components/printComponents/MissionOrderPrint';
import MissionPrint from '@/components/printComponents/MissionPrint';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { isAdminRole } from '@/shared/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// État, chargement et actions du parcours d'interface.


export const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ANNULEE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};



export const prioriteColors: Record<string, string> = {
  BASSE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  MOYENNE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  HAUTE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function useMissionsPageModel() {

  const { user } = useAuth();
  const isAdmin = isAdminRole(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | undefined>();
  const [printingMission, setPrintingMission] = useState<Mission | null>(null);
  const [printingOrder, setPrintingOrder] = useState<{ mission: Mission; technicien: any; interventionTitle?: string } | null>(null);
  const [orderSelection, setOrderSelection] = useState<{ mission: Mission; recipients: Array<{ key: string; technicien: any; interventionTitle?: string }> } | null>(null);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);

  const { data: missions = [], isLoading, error, refetch } = useMissions({ pageSize: 100 });
  const deleteMutation = useDeleteMission();
  const updateStatusMutation = useUpdateMissionStatus();
  const resyncMutation = useResyncMissionFromCrm();
  const { canCreate, canUpdate, canDelete, canExport, canApprove } = getCrudVisibility(user, {
    read: ['missions.read', 'missions.read_all', 'missions.read_assigned'],
    create: ['missions.create'],
    update: ['missions.update', 'missions.assign'],
    remove: ['missions.delete'],
    approve: ['missions.change_status', 'missions.complete'],
    export: ['missions.read'],
  });

  const filteredMissions = missions.filter((mission: Mission) => {
    const matchesSearch =
      mission.titre?.toLowerCase().includes(search.toLowerCase()) ||
      mission.numeroMission?.toLowerCase().includes(search.toLowerCase()) ||
      mission.clientNom?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || mission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasMissionInterventions = (mission: Mission) =>
    (mission._count?.interventions || 0) > 0 || (mission.interventions?.length || 0) > 0;

  const hasCompletedIntervention = (mission: Mission) =>
    (mission.interventions || []).some((intervention) => intervention.status === 'TERMINEE');

  const handleDelete = (id: string, force = false) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
      deleteMutation.mutate({ id, force }, {
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
      const printableMission = fullMission?.data ?? fullMission ?? mission;
      setPrintingMission(printableMission);
    } catch (error) {
      console.error('Erreur impression fiche mission:', error);
      toast.error('Impossible de préparer la fiche mission');
    } finally {
      setIsPrinting(null);
    }
  };

  const handleResyncMission = (mission: Mission) => {
    resyncMutation.mutate(mission.id, {
      onSuccess: () => {
        toast.success('Mission resynchronisee depuis le CRM');
        refetch();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Impossible de resynchroniser la mission');
      },
    });
  };

  const handleDownloadPdf = async (mission: Mission) => {
    setIsPrinting(mission.id);
    try {
      const blob = await technicalService.downloadMissionPdf(mission.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fiche-mission-${mission.numeroMission || mission.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF de la fiche mission télécharge');
    } catch (error) {
      console.error('Erreur export PDF mission:', error);
      toast.error('Impossible d’exporter la fiche mission en PDF');
    } finally {
      setIsPrinting(null);
    }
  };

  const handleMissionOrderPrint = async (mission: Mission) => {
    setIsPrinting(mission.id);
    try {
      const missionResp = await technicalService.getMission(mission.id);
      const fullMission = (missionResp as any)?.data ?? missionResp;
      const printableMission = fullMission?.data ?? fullMission ?? mission;

      const recipientsMap = new Map<string, { key: string; technicien: any; interventionTitle?: string }>();

      (printableMission?.interventions || []).forEach((intervention: any) => {
        (intervention?.techniciens || []).forEach((assignment: any) => {
          const technicien = assignment?.technicien;
          if (!technicien?.id) return;
          if (!recipientsMap.has(technicien.id)) {
            recipientsMap.set(technicien.id, {
              key: technicien.id,
              technicien,
              interventionTitle: intervention?.titre,
            });
          }
        });
      });

      (printableMission?.techniciens || []).forEach((assignment: any) => {
        const technicien = assignment?.technicien;
        if (!technicien?.id) return;
        if (!recipientsMap.has(technicien.id)) {
          recipientsMap.set(technicien.id, {
            key: technicien.id,
            technicien,
            interventionTitle: assignment?.role,
          });
        }
      });

      const recipients = Array.from(recipientsMap.values());

      if (recipients.length === 0) {
        toast.error("Aucun technicien n'est encore affecté à une intervention de cette mission. Affectez d'abord un technicien sur l'intervention concernée.");
        return;
      }

      if (recipients.length === 1) {
        setPrintingOrder({
          mission: printableMission,
          technicien: recipients[0].technicien,
          interventionTitle: recipients[0].interventionTitle,
        });
        return;
      }

      setOrderSelection({
        mission: printableMission,
        recipients,
      });
    } catch (error) {
      console.error('Erreur impression ordre mission:', error);
      toast.error('Impossible de préparer l’ordre de mission');
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
  return {
    user,
    isAdmin,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    showForm,
    setShowForm,
    selectedMission,
    setSelectedMission,
    printingMission,
    setPrintingMission,
    printingOrder,
    setPrintingOrder,
    orderSelection,
    setOrderSelection,
    isPrinting,
    setIsPrinting,
    missions,
    isLoading,
    error,
    refetch,
    deleteMutation,
    updateStatusMutation,
    resyncMutation,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canApprove,
    filteredMissions,
    hasMissionInterventions,
    hasCompletedIntervention,
    handleDelete,
    handleCreate,
    handleEdit,
    handleStatusChange,
    handlePrint,
    handleResyncMission,
    handleDownloadPdf,
    handleMissionOrderPrint,
    formatDate,
    formatCurrency,
  };
}
