'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import {
  operationalRequestsService,
  type OperationalRequestTypeConfig,
} from '@/shared/api/operationalRequests.service';

const typeConfigSchema = z.object({
  label: z.string().min(2, 'Le libellé doit contenir au moins 2 caractères'),
  code: z.string().max(50, 'Le code ne doit pas dépasser 50 caractères').optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TypeConfigFormData = z.infer<typeof typeConfigSchema>;

export default function RequestTypesManagementPage() {
  const queryClient = useQueryClient();
  const { selectedEnterprise } = useEnterprise();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<OperationalRequestTypeConfig | null>(null);
  const [search, setSearch] = useState('');

  const { data: typesResponse, isLoading, error } = useQuery({
    queryKey: ['operational-request-types-admin', selectedEnterprise?.id],
    queryFn: () => operationalRequestsService.listTypes({ all: true }),
    enabled: Boolean(selectedEnterprise),
  });

  const types = typesResponse?.data ?? [];

  const form = useForm<TypeConfigFormData>({
    resolver: zodResolver(typeConfigSchema),
    defaultValues: {
      label: '',
      code: '',
      description: '',
      isActive: true,
    },
  });

  const handleOpenModal = (typeConfig?: OperationalRequestTypeConfig) => {
    if (typeConfig) {
      setEditingType(typeConfig);
      form.reset({
        label: typeConfig.label,
        code: typeConfig.code,
        description: typeConfig.description || '',
        isActive: typeConfig.isActive,
      });
    } else {
      setEditingType(null);
      form.reset({
        label: '',
        code: '',
        description: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    form.reset();
  };

  const createMutation = useMutation({
    mutationFn: (data: { label: string; code?: string; description?: string }) =>
      operationalRequestsService.createType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-request-types-admin'] });
      queryClient.invalidateQueries({ queryKey: ['operational-request-types'] });
      toast.success('Type de demande créé avec succès');
      handleCloseModal();
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { label?: string; description?: string; isActive?: boolean } }) =>
      operationalRequestsService.updateType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-request-types-admin'] });
      queryClient.invalidateQueries({ queryKey: ['operational-request-types'] });
      toast.success('Type de demande mis à jour avec succès');
      handleCloseModal();
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => operationalRequestsService.deleteType(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['operational-request-types-admin'] });
      queryClient.invalidateQueries({ queryKey: ['operational-request-types'] });
      toast.success(res?.message || 'Type supprimé avec succès');
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const onSubmit = (values: TypeConfigFormData) => {
    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        data: {
          label: values.label,
          description: values.description,
          isActive: values.isActive,
        },
      });
    } else {
      createMutation.mutate({
        label: values.label,
        code: values.code || undefined,
        description: values.description || undefined,
      });
    }
  };

  const filteredTypes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return types;

    return types.filter((t) =>
      [t.label, t.code, t.description].filter(Boolean).some((field) => field?.toLowerCase().includes(query))
    );
  }, [types, search]);

  if (!selectedEnterprise) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Veuillez sélectionner une entreprise active pour gérer ses types de demande opérationnelle.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erreur lors du chargement des types de demande</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Types de Demandes Opérationnelles</h1>
          <p className="text-gray-600 mt-1">
            Définissez les catégories de demandes autorisées pour {selectedEnterprise.name}
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>Nouveau Type</Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Input
            type="search"
            placeholder="Rechercher un type, un code ou un libellé..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xl"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code & Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTypes.map((typeConfig) => (
                <tr key={typeConfig.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-100 font-bold text-blue-700">
                        {typeConfig.code.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900">{typeConfig.label}</div>
                        <div className="text-xs font-mono text-gray-500">{typeConfig.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-sm text-gray-600">
                    {typeConfig.description || <span className="text-gray-400 italic">Aucune description</span>}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        typeConfig.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {typeConfig.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top text-right text-sm font-medium space-x-3">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => handleOpenModal(typeConfig)}
                    >
                      Modifier
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => {
                        if (confirm(`Supprimer ou désactiver le type "${typeConfig.label}" ?`)) {
                          deleteMutation.mutate(typeConfig.id);
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTypes.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={4}>
                    Aucun type de demande configuré. Cliquez sur « Nouveau Type » pour en ajouter un.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingType ? 'Modifier le type de demande' : 'Nouveau type de demande'}
            </h2>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Libellé affiché *</label>
                <Input
                  {...form.register('label')}
                  placeholder="Ex: Achats / Approvisionnement"
                  className="mt-1"
                />
                {form.formState.errors.label && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.label.message}</p>
                )}
              </div>

              {!editingType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code interne (facultatif)</label>
                  <Input
                    {...form.register('code')}
                    placeholder="Ex: PROCUREMENT"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Généré automatiquement si vide (ex: ACHATS_APPROVISIONNEMENT).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Ex: Demandes de dépenses liées aux achats..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {editingType && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...form.register('isActive')}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Type actif (disponible pour les utilisateurs)
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingType ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
