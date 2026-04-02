'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CampagneMail, CampagneStatus } from '@/shared/api/communication';
import { communicationService } from '@/shared/api/communication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { useCampaigns } from '@/hooks/campaigns/useCampaigns';
import { useTemplates } from '@/hooks/campaigns/useTemplates';
import {
  CampaignFormValues,
  SequenceStepForm,
  CampaignStopConditions,
} from '@/types/campaigns';
import {
  buildSequencePayload,
  computeCampaignStats,
  formatDestinataires,
  getDefaultSequenceSteps,
  mergeSequenceSteps,
  normalizeDate,
  parseDestinataires,
  toInputDateTime,
} from '@/utils/campaigns/helpers';
import { CampaignStats } from '@/components/commercial/campaigns/CampaignStats';
import { CampaignFilters } from '@/components/commercial/campaigns/CampaignFilters';
import { CampaignTable } from '@/components/commercial/campaigns/CampaignTable';
import { CampaignForm } from '@/components/commercial/campaigns/CampaignForm';
import { RelanceTasks } from '@/components/commercial/campaigns/RelanceTasks';

export default function EmailCampaignsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CampagneStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampagneMail | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStepForm[]>(getDefaultSequenceSteps());
  const [stopConditions, setStopConditions] = useState<CampaignStopConditions>({
    stopOnReply: true,
    stopOnSigned: true,
  });
  const { canCreate, canUpdate, canDelete } = getCrudVisibility(user, {
    read: ['emails.read'],
    create: ['emails.send', 'emails.manage_templates'],
    update: ['emails.manage_templates', 'emails.send'],
    remove: ['emails.manage_templates'],
  });

  const { campaigns, isLoading, createMutation, updateMutation, deleteMutation, error } =
    useCampaigns(statusFilter);
  const queryClient = useQueryClient();
  const { templates, error: templatesError, refetch: refetchTemplates } = useTemplates();

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
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const templateForm = useForm<{
    nom: string;
    sujet: string;
    contenu: string;
    variablesText: string;
  }>({
    defaultValues: {
      nom: '',
      sujet: '',
      contenu: '',
      variablesText: '',
    },
  });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const createTemplateMutation = useMutation({
    mutationFn: (payload: { nom: string; sujet: string; contenu: string; variablesText: string }) =>
      communicationService.createTemplate({
        nom: payload.nom.trim(),
        sujet: payload.sujet.trim(),
        contenu: payload.contenu.trim(),
        type: 'EMAIL',
        variables: payload.variablesText
          ? payload.variablesText.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      refetchTemplates();
    },
  });

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
      setSequenceSteps(mergeSequenceSteps(editingCampaign.sequence));
      setStopConditions({
        stopOnReply: Boolean(editingCampaign.conditionsArret?.stopOnReply),
        stopOnSigned: Boolean(editingCampaign.conditionsArret?.stopOnSigned),
      });
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
      setSequenceSteps(getDefaultSequenceSteps());
      setStopConditions({ stopOnReply: true, stopOnSigned: true });
    }
  }, [dialogOpen, editingCampaign, form]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.template?.sujet || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, statusFilter]);

  const stats = useMemo(() => computeCampaignStats(campaigns), [campaigns]);

  const openCreate = () => {
    setEditingCampaign(null);
    setDialogOpen(true);
  };

  const openEdit = (campaign: CampagneMail) => {
    setEditingCampaign(campaign);
    setDialogOpen(true);
  };

  const handleUpdateStep = (
    campaignId: string,
    step: number,
    updates: { status?: string; report?: string; outcome?: string }
  ) => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) return;
    const currentSequence = Array.isArray(campaign.sequence) ? campaign.sequence : [];
    const updatedSequence = currentSequence.map((item) =>
      item?.step === step ? { ...item, ...updates } : item
    );
    updateMutation.mutate({ id: campaignId, payload: { sequence: updatedSequence } });
  };

  const handleDelete = (campaign: CampagneMail) => {
    if (confirm(`Supprimer la campagne "${campaign.nom}" ?`)) {
      deleteMutation.mutate(campaign.id);
    }
  };

  const onSubmit = async (values: CampaignFormValues) => {
    if (editingCampaign) {
      await updateMutation.mutateAsync({
        id: editingCampaign.id,
        payload: {
          nom: values.nom.trim(),
          templateId: values.templateId.trim(),
          destinataires: parseDestinataires(values.destinatairesText),
          status: values.status,
          dateEnvoi: normalizeDate(values.dateEnvoi),
          objectif: values.objectif || undefined,
          segment: values.segment || undefined,
          sequence: buildSequencePayload(values.templateId, sequenceSteps),
          conditionsArret: stopConditions,
        },
      });
    } else {
      await createMutation.mutateAsync({
        nom: values.nom.trim(),
        templateId: values.templateId.trim(),
        destinataires: parseDestinataires(values.destinatairesText),
        status: values.status,
        dateEnvoi: normalizeDate(values.dateEnvoi),
        objectif: values.objectif || undefined,
        segment: values.segment || undefined,
        sequence: buildSequencePayload(values.templateId, sequenceSteps),
        conditionsArret: stopConditions,
      });
    }

    setDialogOpen(false);
    setEditingCampaign(null);
  };

  const handleCreateTemplate = () => {
    setTemplateDialogOpen(true);
  };

  return (
    // ✅ FIX: Ajout de la classe overflow-y-auto et structure scrollable
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Campagnes Email</h1>
          <p className="text-muted-foreground">Créez, planifiez et suivez vos relances commerciales.</p>
        </div>

        {/* Stats */}
        <CampaignStats stats={stats} />

        <RelanceTasks campaigns={campaigns} onUpdateStep={handleUpdateStep} />

        {/* Liste des campagnes */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des campagnes</CardTitle>
            <CardDescription>Gérez vos campagnes et suivez les performances.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <CampaignFilters
                searchTerm={searchTerm}
                statusFilter={statusFilter}
                onSearchChange={setSearchTerm}
                onStatusChange={setStatusFilter}
                onCreate={openCreate}
                canCreate={canCreate}
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Impossible de charger les campagnes pour le moment. Réessayez dans quelques instants.
              </div>
            )}

            {templatesError && (
              <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                Les modèles d'email ne sont pas disponibles pour le moment.
              </div>
            )}

            <CampaignTable
              campaigns={filteredCampaigns}
              isLoading={isLoading}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEdit}
              onDelete={handleDelete}
              deletePending={deleteMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Dialogue de création/édition de campagne */}
        {(canCreate || canUpdate) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
                </DialogTitle>
                <DialogDescription>
                  {editingCampaign
                    ? 'Mettez à jour la campagne.'
                    : 'Créez une nouvelle campagne email.'}
                </DialogDescription>
              </DialogHeader>

              <CampaignForm
                form={form}
                templates={templates}
                selectedTemplate={selectedTemplate}
                sequenceSteps={sequenceSteps}
                onSequenceChange={setSequenceSteps}
                stopConditions={stopConditions}
                onStopConditionsChange={setStopConditions}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                onCancel={() => setDialogOpen(false)}
                onSubmit={onSubmit}
                onCreateTemplate={handleCreateTemplate}
                submitLabel={editingCampaign ? 'Mettre à jour' : 'Créer'}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Dialogue de création de template */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau modèle d'email</DialogTitle>
              <DialogDescription>Créez un modèle réutilisable pour vos campagnes.</DialogDescription>
            </DialogHeader>

            <form
              onSubmit={templateForm.handleSubmit(async (values) => {
                await createTemplateMutation.mutateAsync(values);
                templateForm.reset();
                setTemplateDialogOpen(false);
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Nom du modèle *</label>
                <Input {...templateForm.register('nom', { required: true })} />
                {templateForm.formState.errors.nom && (
                  <p className="text-xs text-red-600">Nom requis</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sujet *</label>
                <Input {...templateForm.register('sujet', { required: true })} />
                {templateForm.formState.errors.sujet && (
                  <p className="text-xs text-red-600">Sujet requis</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contenu *</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md min-h-[140px]"
                  {...templateForm.register('contenu', { required: true })}
                />
                {templateForm.formState.errors.contenu && (
                  <p className="text-xs text-red-600">Contenu requis</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Variables (séparées par des virgules)</label>
                <Input {...templateForm.register('variablesText')} placeholder="prenom, societe, montant" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  Créer le modèle
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
