'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService, Dashboard } from '@/shared/api/analytics/analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { BarChart, FileText, Download, Play, Plus, Edit, Trash2 } from 'lucide-react';

interface ReportFormValues {
  nom: string;
  description?: string;
}

export default function CRMReportsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Dashboard | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['crm-reports'],
    queryFn: async () => {
      const dashboards = await analyticsService.getDashboards();
      return dashboards;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ReportFormValues) => analyticsService.createDashboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reports'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Dashboard> }) => analyticsService.updateDashboard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analyticsService.deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reports'] });
    },
  });

  const form = useForm<ReportFormValues>({
    defaultValues: {
      nom: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    if (editingReport) {
      form.reset({
        nom: editingReport.nom || '',
        description: editingReport.description || '',
      });
    } else {
      form.reset({
        nom: '',
        description: '',
      });
    }
  }, [dialogOpen, editingReport, form]);

  const openCreate = () => {
    setEditingReport(null);
    setDialogOpen(true);
  };

  const openEdit = (report: Dashboard) => {
    setEditingReport(report);
    setDialogOpen(true);
  };

  const handleDelete = (report: Dashboard) => {
    if (confirm(`Supprimer le rapport ${report.nom} ?`)) {
      deleteMutation.mutate(report.id);
    }
  };

  const onSubmit = async (values: ReportFormValues) => {
    try {
      if (editingReport) {
        await updateMutation.mutateAsync({ id: editingReport.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
      setEditingReport(null);
    } catch (error) {
      console.error('Erreur rapport:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports CRM</h1>
          <p className="mt-2 text-sm text-muted-foreground">Analyses et rapports de performance commerciale</p>
        </div>
        <Button onClick={openCreate}>
          <BarChart className="mr-2 h-4 w-4" />
          Nouveau rapport
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Nom du rapport</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Format</th>
                  <th className="text-left p-4 font-medium">Frequence</th>
                  <th className="text-left p-4 font-medium">Derniere mise a jour</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t hover:bg-muted/50">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {report.nom}
                      </div>
                    </td>
                    <td className="p-4"><Badge variant="outline">CUSTOM</Badge></td>
                    <td className="p-4">DASHBOARD</td>
                    <td className="p-4">MANUEL</td>
                    <td className="p-4">{new Date(report.updatedAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" title="Executer">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" title="Telecharger">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" title="Modifier" onClick={() => openEdit(report)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" title="Supprimer" className="text-red-600" onClick={() => handleDelete(report)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun rapport configure
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Modifier rapport' : 'Nouveau rapport'}
            </DialogTitle>
            <DialogDescription>
              {editingReport ? 'Mettez a jour le rapport.' : 'Creez un nouveau rapport CRM.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <Input {...form.register('nom', { required: true })} />
              {form.formState.errors.nom && (
                <p className="text-xs text-red-600">Nom requis</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="w-full px-3 py-2 border rounded-md" rows={3} {...form.register('description')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingReport ? 'Mettre a jour' : 'Creer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
