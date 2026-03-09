'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, AlertCircle, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { permissionRequestService } from '@/services/permissionRequestService';
import { PendingRequestsList } from '@/components/PermissionWorkflow/PendingRequestsList';
import { CreatePermissionRequestForm } from '@/components/PermissionWorkflow/CreatePermissionRequestForm';
import { CreateRoleWithTemplateForm } from '@/components/PermissionWorkflow/CreateRoleWithTemplateForm';
import { useAuth } from '@/shared/hooks/useAuth';
import { hasAnyPermission, hasPermission } from '@/shared/permissions';

export default function PermissionWorkflowPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();
  const canManageRequests = hasPermission(user, 'permissions.manage');
  const canCreateRequests = hasAnyPermission(user, ['permissions.read', 'permissions.manage']);
  const canCreateRoles = hasPermission(user, 'roles.create');
  const visibleTabs = useMemo(
    () =>
      [
        canManageRequests ? 'pending' : null,
        canCreateRequests ? 'create' : null,
        canCreateRoles ? 'templates' : null,
      ].filter(Boolean) as string[],
    [canCreateRequests, canCreateRoles, canManageRequests]
  );
  const normalizedActiveTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] || 'create';

  useEffect(() => {
    if (normalizedActiveTab !== activeTab) {
      setActiveTab(normalizedActiveTab);
    }
  }, [activeTab, normalizedActiveTab]);

  // Récupérer les demandes en attente
  const { data: pendingRequests, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['permission-requests', 'pending'],
    queryFn: () => permissionRequestService.getPendingRequests(),
  });

  // Récupérer toutes les demandes
  const { data: allRequests, isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['permission-requests', 'all'],
    queryFn: () => permissionRequestService.listRequests(),
  });

  // Récupérer les rôles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionRequestService.getRoles(),
  });

  // Récupérer les permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionRequestService.getPermissions(),
  });

  // Mutation pour approuver une demande
  const approveMutation = useMutation({
    mutationFn: (id: number) => permissionRequestService.approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      toast.success('Demande approuvée avec succès');
      refetchPending();
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'approbation');
    }
  });

  // Mutation pour rejeter une demande
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      permissionRequestService.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      toast.success('Demande rejetée');
      refetchPending();
      refetchAll();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet');
    }
  });

  // Statistiques
  const stats = {
    pending: pendingRequests?.length || 0,
    total: allRequests?.length || 0,
    approved: allRequests?.filter((r: any) => r.status === 'APPROVED').length || 0,
    rejected: allRequests?.filter((r: any) => r.status === 'REJECTED').length || 0,
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: number, reason: string) => {
    rejectMutation.mutate({ id, reason });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-8 w-8" />
            Workflow d'Approbation des Permissions
          </h1>
          <p className="text-muted-foreground">
            Gérez les demandes de changement de permissions et les workflows d'approbation
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Demandes à traiter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Toutes les demandes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Demandes validées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Demandes refusées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {canManageRequests && (
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Demandes en attente
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {canCreateRequests && (
            <TabsTrigger value="create" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Créer une demande
            </TabsTrigger>
          )}
          {canCreateRoles && (
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Rôles avec templates
            </TabsTrigger>
          )}
        </TabsList>

        {canManageRequests && (
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demandes de changement de permissions en attente</CardTitle>
              <CardDescription>
                Approuvez ou rejetez les demandes de modification de permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingRequestsList
                requests={pendingRequests || []}
                loading={pendingLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                approving={approveMutation.isPending}
                rejecting={rejectMutation.isPending}
                canManageRequests={canManageRequests}
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canCreateRequests && (
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Créer une nouvelle demande de permissions</CardTitle>
              <CardDescription>
                Soumettez une demande de changement de permissions pour validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreatePermissionRequestForm
                roles={roles}
                permissions={permissions}
                onSuccess={() => {
                  refetchPending();
                  refetchAll();
                  setActiveTab(canManageRequests ? 'pending' : normalizedActiveTab);
                  toast.success('Demande créée avec succès');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canCreateRoles && (
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Créer un rôle avec template prédéfini</CardTitle>
              <CardDescription>
                Utilisez des templates de rôles pour créer rapidement des rôles avec des permissions prédéfinies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateRoleWithTemplateForm
                onSuccess={() => {
                  toast.success('Rôle créé avec succès');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
