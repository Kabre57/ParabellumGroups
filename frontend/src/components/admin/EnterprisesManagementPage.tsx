'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { enterpriseApi, Enterprise } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const enterpriseSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  code: z.string().max(10, 'Le code ne doit pas depasser 10 caracteres').optional(),
  description: z.string().optional(),
  parentEnterpriseId: z.string().optional(),
});

type EnterpriseFormData = z.infer<typeof enterpriseSchema>;

const formatEnterpriseKind = (enterprise: Enterprise) => {
  if (enterprise.parentEnterprise?.name) {
    return {
      label: 'Filiale',
      helper: `Rattachee a ${enterprise.parentEnterprise.name}`,
    };
  }

  if ((enterprise._count?.childEnterprises || 0) > 0) {
    return {
      label: 'Entreprise mere',
      helper: `${enterprise._count?.childEnterprises || 0} filiale(s)`,
    };
  }

  return {
    label: 'Entreprise independante',
    helper: 'Aucune filiale rattachee',
  };
};

export default function EnterprisesManagementPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const { data: enterprisesResponse, isLoading, error } = useQuery({
    queryKey: ['enterprises-management'],
    queryFn: () => enterpriseApi.getAll({ limit: 200 }),
  });

  const enterprises = enterprisesResponse?.data ?? [];

  const form = useForm<EnterpriseFormData>({
    resolver: zodResolver(enterpriseSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parentEnterpriseId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) => enterpriseApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['enterprises-management'] });
      toast.success('Entreprise creee avec succes');
      handleCloseModal();
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la creation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: FormData | Record<string, unknown> }) =>
      enterpriseApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['enterprises-management'] });
      toast.success('Entreprise mise a jour avec succes');
      handleCloseModal();
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la mise a jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => enterpriseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['enterprises-management'] });
      toast.success('Entreprise supprimee avec succes');
    },
    onError: (mutationError: any) => {
      toast.error(mutationError?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const filteredEnterprises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return enterprises;

    return enterprises.filter((enterprise) =>
      [
        enterprise.name,
        enterprise.code,
        enterprise.description,
        enterprise.parentEnterprise?.name,
        ...(enterprise.childEnterprises?.map((child) => child.name) || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [enterprises, search]);

  const parentOptions = useMemo(
    () => enterprises.filter((enterprise) => String(enterprise.id) !== String(editingEnterprise?.id ?? '')),
    [enterprises, editingEnterprise]
  );

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEnterprise(null);
    setSelectedFile(null);
    setLogoPreview('');
    form.reset({
      name: '',
      code: '',
      description: '',
      parentEnterpriseId: '',
    });
  };

  const handleOpenModal = (enterprise?: Enterprise) => {
    if (enterprise) {
      setEditingEnterprise(enterprise);
      form.reset({
        name: enterprise.name,
        code: enterprise.code || '',
        description: enterprise.description || '',
        parentEnterpriseId: enterprise.parentEnterpriseId ? String(enterprise.parentEnterpriseId) : '',
      });
      setLogoPreview(enterprise.logoUrl || '');
    } else {
      setEditingEnterprise(null);
      form.reset({
        name: '',
        code: '',
        description: '',
        parentEnterpriseId: '',
      });
      setLogoPreview('');
    }

    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: EnterpriseFormData) => {
    const payload = {
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      parentEnterpriseId: values.parentEnterpriseId ? Number(values.parentEnterpriseId) : null,
    };

    if (selectedFile) {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('code', values.code || '');
      formData.append('description', values.description || '');
      formData.append('parentEnterpriseId', values.parentEnterpriseId || '');
      formData.append('logo', selectedFile);

      if (editingEnterprise) {
        updateMutation.mutate({ id: editingEnterprise.id, data: formData });
      } else {
        createMutation.mutate(formData);
      }
      return;
    }

    if (editingEnterprise) {
      updateMutation.mutate({ id: editingEnterprise.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

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
        <p className="text-red-800">Erreur lors du chargement des entreprises</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Entreprises</h1>
          <p className="text-gray-600 mt-1">Structure de groupe, entreprises meres et filiales independantes</p>
        </div>
        <Button onClick={() => handleOpenModal()}>Nouvelle Entreprise</Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Input
            type="search"
            placeholder="Rechercher une entreprise, un code ou une filiale..."
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
                  Logo & Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Structure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateurs / Services
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
              {filteredEnterprises.map((enterprise) => {
                const kind = formatEnterpriseKind(enterprise);

                return (
                  <tr key={enterprise.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-3">
                        {enterprise.logoUrl ? (
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
                            <Image src={enterprise.logoUrl} alt={enterprise.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-100 font-bold text-blue-700">
                            {enterprise.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900">{enterprise.name}</div>
                          <div className="text-xs text-gray-500">{enterprise.code || 'Sans code'}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {enterprise.description || 'Aucune description'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm font-semibold text-gray-900">{kind.label}</div>
                      <div className="text-xs text-gray-500">{kind.helper}</div>
                      {enterprise.childEnterprises && enterprise.childEnterprises.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          Filiales : {enterprise.childEnterprises.map((child) => child.name).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{enterprise._count?.users || 0}</span> utilisateurs
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-semibold text-gray-800">{enterprise._count?.services || 0}</span> services
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          enterprise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {enterprise.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-right text-sm font-medium space-x-3">
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => handleOpenModal(enterprise)}>
                        Modifier
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          if (confirm('Supprimer cette entreprise ?')) {
                            deleteMutation.mutate(enterprise.id);
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredEnterprises.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={5}>
                    Aucune entreprise ne correspond a la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {editingEnterprise ? "Modifier l'entreprise" : 'Nouvelle Entreprise'}
            </h2>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-gray-100">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Preview" fill className="object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Aucun logo</div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <Input {...form.register('name')} placeholder="Nom de l'entreprise" />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <Input {...form.register('code')} placeholder="Ex: PBG, BTP..." />
                  {form.formState.errors.code && (
                    <p className="mt-1 text-xs text-red-500">{form.formState.errors.code.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Entreprise mere</label>
                <select
                  {...form.register('parentEnterpriseId')}
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                >
                  <option value="">Aucune - entreprise independante ou tete de groupe</option>
                  {parentOptions.map((enterprise) => (
                    <option key={enterprise.id} value={String(enterprise.id)}>
                      {enterprise.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Selectionne une entreprise mere uniquement si cette entreprise est une filiale. Une entreprise mere peut regrouper plusieurs filiales independantes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...form.register('description')}
                  className="w-full rounded-md border p-2 text-sm"
                  rows={4}
                  placeholder="Description de l'entreprise..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleCloseModal}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEnterprise ? 'Enregistrer' : 'Creer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
