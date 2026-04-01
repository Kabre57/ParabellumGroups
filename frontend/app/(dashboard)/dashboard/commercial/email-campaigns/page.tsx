'use client';

import { useMemo, useState, useEffect, type ComponentProps } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mail, Send, BarChart3, Users, Search, Filter, Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  communicationService,
  CampagneMail,
  CampagneStatus,
  CampagneDestinataire,
  CampagneTemplate,
} from '@/shared/api/communication';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';

interface CampaignFormValues {
  nom: string;
  templateId: string;
  objectif: string;
  segment: string;
  status: CampagneStatus;
  dateEnvoi?: string;
  destinatairesText: string;
}

interface SequenceStepForm {
  step: number;
  label: string;
  delayDays: string;
  templateId: string;
}

const STATUS_OPTIONS: { value: CampagneStatus; label: string }[] = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'PROGRAMMEE', label: 'Programmee' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminee' },
  { value: 'ANNULEE', label: 'Annulee' },
];

const OBJECTIF_OPTIONS = [
  { value: 'RELANCE_PROSPECT', label: 'Relance prospect' },
  { value: 'RELANCE_DEVIS', label: 'Relance devis' },
  { value: 'RELANCE_CLIENT', label: 'Relance client' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'FIDELISATION', label: 'Fidelisation' },
];

const SEGMENT_OPTIONS = [
  { value: 'PROSPECTS', label: 'Prospects a relancer' },
  { value: 'DEVIS_ENVOYES', label: 'Devis envoyes' },
  { value: 'CLIENTS', label: 'Clients existants' },
  { value: 'PERSONNALISE', label: 'Liste manuelle' },
];

const toInputDateTime = (value?: string) => {
  if (!value) return '';
  return value.length >= 16 ? value.slice(0, 16) : value;
};

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

const parseDestinataires = (value: string): CampagneDestinataire[] => {
  const emails = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(emails));
  return unique.map((email) => ({ email }));
};

const formatDestinataires = (destinataires?: CampagneDestinataire[]) => {
  if (!Array.isArray(destinataires)) return '';
  return destinataires.map((d) => d.email).filter(Boolean).join('\n');
};

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

export default function EmailCampaignsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CampagneStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampagneMail | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStepForm[]>([
    { step: 2, label: 'Email 2', delayDays: '3', templateId: '' },
    { step: 3, label: 'Email 3', delayDays: '7', templateId: '' },
    { step: 4, label: 'Email 4', delayDays: '15', templateId: '' },
  ]);
  const [stopOnReply, setStopOnReply] = useState(true);
  const [stopOnSigned, setStopOnSigned] = useState(true);
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['emails.read'],
    create: ['emails.send', 'emails.manage_templates'],
    update: ['emails.manage_templates', 'emails.send'],
    remove: ['emails.manage_templates'],
  });

  const { data: campaignsData = [], isLoading } = useQuery<CampagneMail[]>({
    queryKey: ['email-campaigns', statusFilter],
    queryFn: () =>
      communicationService.getCampaigns(
        statusFilter === 'all' ? undefined : { status: statusFilter }
      ),
  });
  const { data: templatesData = [] } = useQuery<CampagneTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: () => communicationService.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CampaignFormValues) =>
      communicationService.createCampaign({
        nom: payload.nom.trim(),
        templateId: payload.templateId.trim(),
        destinataires: parseDestinataires(payload.destinatairesText),
        status: payload.status,
        dateEnvoi: normalizeDate(payload.dateEnvoi),
        objectif: payload.objectif || undefined,
        segment: payload.segment || undefined,
        sequence: [
          { step: 1, templateId: payload.templateId.trim(), delayDays: 0 },
          ...sequenceSteps
            .filter((step) => step.templateId)
            .map((step) => ({
              step: step.step,
              templateId: step.templateId,
              delayDays: Number(step.delayDays) || 0,
            })),
        ],
        conditionsArret: {
          stopOnReply,
          stopOnSigned,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CampaignFormValues }) =>
      communicationService.updateCampaign(id, {
        nom: payload.nom.trim(),
        templateId: payload.templateId.trim(),
        destinataires: parseDestinataires(payload.destinatairesText),
        status: payload.status,
        dateEnvoi: normalizeDate(payload.dateEnvoi),
        objectif: payload.objectif || undefined,
        segment: payload.segment || undefined,
        sequence: [
          { step: 1, templateId: payload.templateId.trim(), delayDays: 0 },
          ...sequenceSteps
            .filter((step) => step.templateId)
            .map((step) => ({
              step: step.step,
              templateId: step.templateId,
              delayDays: Number(step.delayDays) || 0,
            })),
        ],
        conditionsArret: {
          stopOnReply,
          stopOnSigned,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });

  const form = useForm<CampaignFormValues>({
    defaultValues: {
      nom: '',
      templateId: '',
      objectif: 'RELANCE_PROSPECT',
      segment: 'PROSPECTS',
      status: 'BROUILLON',
      dateEnvoi: '',
      destinatairesText: '',
    },
  });
  const selectedTemplateId = form.watch('templateId');
  const selectedTemplate = templatesData.find((template) => template.id === selectedTemplateId);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingCampaign) {
      form.reset({
        nom: editingCampaign.nom,
        templateId: editingCampaign.templateId,
        objectif: editingCampaign.objectif || 'RELANCE_PROSPECT',
        segment: editingCampaign.segment || 'PROSPECTS',
        status: editingCampaign.status,
        dateEnvoi: toInputDateTime(editingCampaign.dateEnvoi),
        destinatairesText: formatDestinataires(editingCampaign.destinataires),
      });
      const savedSequence = Array.isArray(editingCampaign.sequence) ? editingCampaign.sequence : [];
      setSequenceSteps([
        { step: 2, label: 'Email 2', delayDays: '3', templateId: '' },
        { step: 3, label: 'Email 3', delayDays: '7', templateId: '' },
        { step: 4, label: 'Email 4', delayDays: '15', templateId: '' },
      ].map((step) => {
        const match = savedSequence.find((item: any) => item.step === step.step);
        return {
          ...step,
          delayDays: match?.delayDays?.toString?.() || step.delayDays,
          templateId: match?.templateId || '',
        };
      }));
      setStopOnReply(Boolean(editingCampaign.conditionsArret?.stopOnReply));
      setStopOnSigned(Boolean(editingCampaign.conditionsArret?.stopOnSigned));
    } else {
      form.reset({
        nom: '',
        templateId: '',
        objectif: 'RELANCE_PROSPECT',
        segment: 'PROSPECTS',
        status: 'BROUILLON',
        dateEnvoi: '',
        destinatairesText: '',
      });
      setSequenceSteps([
        { step: 2, label: 'Email 2', delayDays: '3', templateId: '' },
        { step: 3, label: 'Email 3', delayDays: '7', templateId: '' },
        { step: 4, label: 'Email 4', delayDays: '15', templateId: '' },
      ]);
      setStopOnReply(true);
      setStopOnSigned(true);
    }
  }, [dialogOpen, editingCampaign, form]);

  const filteredCampaigns = useMemo(() => {
    return campaignsData.filter((campaign) => {
      const matchesSearch =
        campaign.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.template?.sujet || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaignsData, searchTerm, statusFilter]);

  const completedCampaigns = campaignsData.filter(
    (c) => c.status === 'TERMINEE' || c.status === 'EN_COURS'
  );
  const totalOpened = completedCampaigns.reduce((sum, c) => sum + (c.nbLus || 0), 0);
  const totalRecipients = completedCampaigns.reduce(
    (sum, c) => sum + (Array.isArray(c.destinataires) ? c.destinataires.length : 0),
    0
  );
  const totalClicked = 0;

  const stats = {
    total: campaignsData.length,
    sent: campaignsData.filter((c) => c.status === 'EN_COURS' || c.status === 'TERMINEE').length,
    avgOpenRate: totalRecipients > 0 ? ((totalOpened / totalRecipients) * 100).toFixed(1) : '0.0',
    avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0',
  };

  const getStatusBadge = (status: CampagneStatus): { label: string; variant: BadgeVariant } => {
    const labelMap: Record<CampagneStatus, string> = {
      BROUILLON: 'Brouillon',
      PROGRAMMEE: 'Programmee',
      EN_COURS: 'En cours',
      TERMINEE: 'Terminee',
      ANNULEE: 'Annulee',
    };
    const variant: BadgeVariant =
      status === 'EN_COURS' || status === 'PROGRAMMEE' ? 'default' : 'secondary';
    return { label: labelMap[status] || status, variant };
  };

  const calculateRate = (value: number, total: number) => {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openCreate = () => {
    setEditingCampaign(null);
    setDialogOpen(true);
  };

  const openEdit = (campaign: CampagneMail) => {
    setEditingCampaign(campaign);
    setDialogOpen(true);
  };

  const handleDelete = (campaign: CampagneMail) => {
    if (confirm(`Supprimer la campagne "${campaign.nom}" ?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  const onSubmit = async (values: CampaignFormValues) => {
    if (editingCampaign) {
      await updateMutation.mutateAsync({ id: editingCampaign.id, payload: values });
    } else {
      await createMutation.mutateAsync(values);
    }

    setDialogOpen(false);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campagnes Email Marketing</h1>
        <p className="text-muted-foreground">Creez et gerez vos campagnes d emailing</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total campagnes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toutes campagnes confondues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyees</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Campagnes actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d ouverture moyen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Sur campagnes envoyees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de clic moyen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate}%</div>
            <p className="text-xs text-muted-foreground">Engagement des lecteurs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des campagnes</CardTitle>
          <CardDescription>Gerez et suivez vos campagnes email marketing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CampagneStatus | 'all')}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous statuts</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle campagne
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-sm text-muted-foreground">Chargement...</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Nom de la campagne</th>
                    <th className="text-left p-4 font-medium">Sujet</th>
                    <th className="text-left p-4 font-medium">Date d envoi</th>
                    <th className="text-left p-4 font-medium">Destinataires</th>
                    <th className="text-left p-4 font-medium">Ouvertures</th>
                    <th className="text-left p-4 font-medium">Rebonds</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    {(canUpdate || canDelete) && <th className="text-left p-4 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => {
                    const statusBadge = getStatusBadge(campaign.status);
                    const recipients = Array.isArray(campaign.destinataires)
                      ? campaign.destinataires.length
                      : 0;
                    const openRate = calculateRate(campaign.nbLus || 0, recipients);

                    return (
                      <tr key={campaign.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-medium">{campaign.nom}</td>
                        <td className="p-4 text-sm max-w-xs truncate">
                          {campaign.template?.sujet || '-'}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{formatDate(campaign.dateEnvoi)}</td>
                        <td className="p-4 text-sm">{recipients.toLocaleString()}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{campaign.nbLus || 0}</span>
                            <span className="text-xs text-muted-foreground">{openRate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {campaign.nbErreurs > 0 ? (
                            <span className="text-red-600">{campaign.nbErreurs}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        </td>
                        {(canUpdate || canDelete) && (
                          <td className="p-4">
                            <div className="flex gap-2">
                              {canUpdate && (
                                <Button variant="outline" size="sm" onClick={() => openEdit(campaign)}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDelete(campaign)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && filteredCampaigns.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune campagne trouvee
            </div>
          )}
        </CardContent>
      </Card>

      {(canCreate || canUpdate) && (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign ? 'Mettez a jour la campagne.' : 'Creez une nouvelle campagne email.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <Input {...form.register('nom', { required: true })} />
                {form.formState.errors.nom && (
                  <p className="text-xs text-red-600">Nom requis</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Objectif *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('objectif', { required: true })}
                >
                  {OBJECTIF_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Segment cible *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('segment', { required: true })}
                >
                  {SEGMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Modele d email *</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('templateId', { required: true })}
                  disabled={templatesData.length === 0}
                >
                  <option value="">
                    {templatesData.length === 0 ? 'Aucun modele disponible' : 'Selectionner un modele'}
                  </option>
                  {templatesData.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nom}
                    </option>
                  ))}
                </select>
                {selectedTemplate?.sujet && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sujet: {selectedTemplate.sujet}
                  </p>
                )}
                {selectedTemplate?.variables && (
                  <div className="mt-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Variables disponibles: {
                      Array.isArray(selectedTemplate.variables)
                        ? selectedTemplate.variables.join(', ')
                        : typeof selectedTemplate.variables === 'object'
                          ? Object.keys(selectedTemplate.variables).join(', ')
                          : String(selectedTemplate.variables)
                    }
                  </div>
                )}
                {form.formState.errors.templateId && (
                  <p className="text-xs text-red-600">Modele requis</p>
                )}
              </div>

              <div className="md:col-span-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-3">
                <div className="text-sm font-medium">Sequence de relance</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Email 1 part du modele principal. Ajustez les delais et ajoutez des emails si besoin.
                </div>
                <div className="mt-3 grid gap-3">
                  {sequenceSteps.map((step) => (
                    <div key={step.step} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_140px]">
                      <div>
                        <label className="block text-xs font-medium mb-1">{step.label} - Modele</label>
                        <select
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={step.templateId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSequenceSteps((current) =>
                              current.map((item) =>
                                item.step === step.step ? { ...item, templateId: value } : item
                              )
                            );
                          }}
                        >
                          <option value="">Aucun</option>
                          {templatesData.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Delai (jours)</label>
                        <Input
                          type="number"
                          min="0"
                          value={step.delayDays}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSequenceSteps((current) =>
                              current.map((item) =>
                                item.step === step.step ? { ...item, delayDays: value } : item
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="flex items-end text-xs text-muted-foreground">
                        J+{step.delayDays || '0'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={stopOnReply}
                    onChange={(event) => setStopOnReply(event.target.checked)}
                  />
                  Arreter si le prospect repond
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={stopOnSigned}
                    onChange={(event) => setStopOnSigned(event.target.checked)}
                  />
                  Arreter si le devis est signe
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  {...form.register('status')}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date d envoi</label>
                <Input type="datetime-local" {...form.register('dateEnvoi')} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Destinataires (un email par ligne)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md min-h-[120px]"
                  {...form.register('destinatairesText')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCampaign ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
