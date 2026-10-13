'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useContrats,
  useCreateContrat,
  useUpdateContratStatus,
  useContratsExpiring,
  useClients,
} from '@/hooks/useCrm';
import { Client, Contrat } from '@/shared/api/crm/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

// État, chargement et actions du parcours d'interface.


export const STATUS_OPTIONS = [
  'BROUILLON',
  'EN_ATTENTE_SIGNATURE',
  'ACTIF',
  'SUSPENDU',
  'RESILIE',
  'TERMINE',
  'EN_RENOUVELLEMENT',
];



export const TYPE_OPTIONS = [
  'MAINTENANCE',
  'SERVICE',
  'PRODUIT',
  'PARTENARIAT',
  'ABONNEMENT',
  'FORFAIT',
  'CONSULTING',
  'FORMATION',
  'LICENCE',
  'SAAS',
];



export interface ContratFormValues {
  clientId: string;
  titre: string;
  description?: string;
  typeContrat: string;
  dateDebut: string;
  dateFin?: string;
  dateSignature?: string;
  dateEffet?: string;
  montantHT: string;
  montantTTC: string;
  tauxTVA: string;
  devise: string;
  status: string;
  periodicitePaiement?: string;
  jourPaiement?: string;
  estRenouvelable?: boolean;
  periodeRenouvellement?: string;
  dateProchainRenouvellement?: string;
  preavisRenouvellement?: string;
  conditionsParticulieres?: string;
  signataireId?: string;
}

export function useContractsPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { canCreate, canUpdate } = getCrudVisibility(user, {
    read: ['contracts.read', 'contracts.read_all'],
    create: ['contracts.create'],
    update: ['contracts.update', 'contracts.approve', 'contracts.sign', 'contracts.terminate'],
  });
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contrat | null>(null);

  const { data: contrats = [], isLoading } = useContrats({ page: 1, limit: 200 });
  const { data: clients = [] } = useClients({ pageSize: 200 });
  const { data: expiringData } = useContratsExpiring({ days: 30 });

  const contratsArray: Contrat[] = Array.isArray(contrats) ? (contrats as Contrat[]) : [];
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const createMutation = useCreateContrat();
  const updateStatusMutation = useUpdateContratStatus();

  const clientMap = useMemo(() => {
    const entries: Array<[string, Client]> = clientsArray.map((c): [string, Client] => [c.id, c]);
    return new Map(entries);
  }, [clientsArray]);

  const filteredContrats = useMemo(() => {
    return contratsArray.filter((contrat: Contrat) => {
      const client = clientMap.get(contrat.clientId);
      const clientName = client?.nom || '';
      const matchesSearch =
        contrat.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrat.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contrat.numeroContrat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || contrat.status === statusFilter;
      const matchesType = typeFilter === 'all' || contrat.typeContrat === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contratsArray, clientMap, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = contratsArray.length;
    const actifs = contratsArray.filter((c: Contrat) => c.status === 'ACTIF').length;
    const attente = contratsArray.filter((c: Contrat) => c.status === 'EN_ATTENTE_SIGNATURE').length;
    const expiringSoon = (expiringData as any)?.meta?.count || 0;
    return { total, actifs, attente, expiringSoon };
  }, [contratsArray, expiringData]);

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-800',
      BROUILLON: 'bg-gray-100 text-gray-800',
      EN_ATTENTE_SIGNATURE: 'bg-yellow-100 text-yellow-800',
      SUSPENDU: 'bg-orange-100 text-orange-800',
      TERMINE: 'bg-blue-100 text-blue-800',
      RESILIE: 'bg-red-100 text-red-800',
      EN_RENOUVELLEMENT: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={statuses[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const openCreate = () => {
    setEditingContract(null);
    setDialogOpen(true);
  };

  const openStatusEdit = (contrat: Contrat) => {
    setEditingContract(contrat);
    setStatusDialogOpen(true);
  };

  const form = useForm<ContratFormValues>({
    defaultValues: {
      clientId: '',
      titre: '',
      description: '',
      typeContrat: 'SERVICE',
      dateDebut: '',
      dateFin: '',
      dateSignature: '',
      dateEffet: '',
      montantHT: '',
      montantTTC: '',
      tauxTVA: '18',
      devise: 'XOF',
      status: 'BROUILLON',
      periodicitePaiement: '',
      jourPaiement: '',
      estRenouvelable: false,
      periodeRenouvellement: '',
      dateProchainRenouvellement: '',
      preavisRenouvellement: '',
      conditionsParticulieres: '',
      signataireId: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset({
      clientId: '',
      titre: '',
      description: '',
      typeContrat: 'SERVICE',
      dateDebut: '',
      dateFin: '',
      dateSignature: '',
      dateEffet: '',
      montantHT: '',
      montantTTC: '',
      tauxTVA: '18',
      devise: 'XOF',
      status: 'BROUILLON',
      periodicitePaiement: '',
      jourPaiement: '',
      estRenouvelable: false,
      periodeRenouvellement: '',
      dateProchainRenouvellement: '',
      preavisRenouvellement: '',
      conditionsParticulieres: '',
      signataireId: '',
    });
  }, [dialogOpen, form]);

  const onSubmit = async (values: ContratFormValues) => {
    try {
      const montantHT = parseFloat(values.montantHT || '0');
      const tauxTVA = parseFloat(values.tauxTVA || '0');
      const montantTTC = parseFloat(values.montantTTC || '0') || montantHT * (1 + tauxTVA / 100);

      await createMutation.mutateAsync({
        ...values,
        jourPaiement: values.jourPaiement ? Number(values.jourPaiement) : undefined,
        preavisRenouvellement: values.preavisRenouvellement ? Number(values.preavisRenouvellement) : undefined,
        montantHT,
        montantTTC,
        tauxTVA,
      });

      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
      setDialogOpen(false);
    } catch (error) {
      console.error('Erreur contrat:', error);
    }
  };

  const onUpdateStatus = async (status: string) => {
    if (!editingContract) return;
    try {
      await updateStatusMutation.mutateAsync({ id: editingContract.id, status });
      queryClient.invalidateQueries({ queryKey: ['crm', 'contrats'] });
      setStatusDialogOpen(false);
      setEditingContract(null);
    } catch (error) {
      console.error('Erreur statut contrat:', error);
    }
  };
  return {
    user,
    queryClient,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dialogOpen,
    setDialogOpen,
    canCreate,
    canUpdate,
    statusDialogOpen,
    setStatusDialogOpen,
    editingContract,
    setEditingContract,
    contrats,
    isLoading,
    clients,
    expiringData,
    contratsArray,
    clientsArray,
    createMutation,
    updateStatusMutation,
    clientMap,
    filteredContrats,
    stats,
    getStatusBadge,
    openCreate,
    openStatusEdit,
    form,
    onSubmit,
    onUpdateStatus,
  };
}
