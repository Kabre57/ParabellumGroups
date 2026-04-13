'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enterpriseApi, Enterprise } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';

const enterpriseSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  code: z.string().max(10, 'Le code ne doit pas dépasser 10 caractères').optional(),
  description: z.string().optional(),
});

type EnterpriseFormData = z.infer<typeof enterpriseSchema>;

export default function EnterprisesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['enterprises', page],
    queryFn: () => enterpriseApi.getAll({ page, limit: 10 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EnterpriseFormData>({
    resolver: zodResolver(enterpriseSchema),
  });

  const handleOpenModal = (enterprise?: Enterprise) => {
    if (enterprise) {
      setEditingEnterprise(enterprise);
      setValue('name', enterprise.name);
      setValue('code', enterprise.code || '');
      setValue('description', enterprise.description || '');
      setLogoPreview(enterprise.logoUrl || '');
    } else {
      setEditingEnterprise(null);
      reset();
      setLogoPreview('');
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: enterpriseApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise créée avec succès');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => enterpriseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise mise à jour');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string | number; isActive: boolean }) =>
      enterpriseApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: enterpriseApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise supprimée');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const onSubmit = async (formData: EnterpriseFormData) => {
    // Si on a un fichier on utilise FormData
    if (selectedFile || editingEnterprise) {
      const data = new FormData();
      data.append('name', formData.name);
      if (formData.code) data.append('code', formData.code);
      if (formData.description) data.append('description', formData.description);
      if (selectedFile) data.append('logo', selectedFile);

      if (editingEnterprise) {
         updateMutation.mutate({ id: editingEnterprise.id, data });
      } else {
         createMutation.mutate(data);
      }
    } else {
       // Just JSON si pas d'image et création
       if (editingEnterprise) {
         updateMutation.mutate({ id: editingEnterprise.id, data: formData });
       } else {
         createMutation.mutate(formData);
       }
    }
  };

  const handleToggleStatus = (enterprise: Enterprise) => {
    updateStatusMutation.mutate({ id: enterprise.id, isActive: !enterprise.isActive });
  };

  const handleDelete = (enterpriseId: string | number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      deleteMutation.mutate(enterpriseId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
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

  // Filtrage local en attendant que l'API le gère si besoin
  const displayedData = data?.data?.filter((ent) => 
    search ? ent.name.toLowerCase().includes(search.toLowerCase()) || ent.code?.toLowerCase().includes(search.toLowerCase()) : true
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entreprises</h1>
          <p className="text-gray-600 mt-1">Gérez les locataires (tenants) et filiales du système</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          Nouvelle Entreprise
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Input
            type="search"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
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
                  Code
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
              {displayedData.map((enterprise) => (
                <tr key={enterprise.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                       {enterprise.logoUrl ? (
                         <div className="h-10 w-10 flex-shrink-0 mr-3 hidden sm:block relative rounded-md overflow-hidden bg-gray-100 border">
                           <Image src={enterprise.logoUrl} alt={enterprise.name} fill className="object-cover" />
                         </div>
                       ) : (
                         <div className="h-10 w-10 flex-shrink-0 mr-3 hidden sm:flex items-center justify-center rounded-md bg-blue-100 text-blue-600 font-bold border border-blue-200">
                           {enterprise.name.charAt(0)}
                         </div>
                       )}
                       <div>
                         <div className="text-sm font-bold text-gray-900">{enterprise.name}</div>
                         {enterprise.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{enterprise.description}</div>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-600 bg-gray-100 px-2 rounded w-max">{enterprise.code || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                       <span className="font-semibold text-gray-800">{enterprise._count?.users || 0}</span> employés
                       <span className="mx-2 text-gray-300">|</span>
                       <span className="font-semibold text-gray-800">{enterprise._count?.services || 0}</span> services
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        enterprise.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {enterprise.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleOpenModal(enterprise)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => handleToggleStatus(enterprise)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {enterprise.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    {!enterprise._count?.users && !enterprise._count?.services && (
                       <button
                         onClick={() => handleDelete(enterprise.id)}
                         className="text-red-600 hover:text-red-900"
                       >
                         Supprimer
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {data?.page || 1} sur {data?.pages || 1} ({data?.total || displayedData.length} entreprises)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === (data?.pages || 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-bold">{editingEnterprise ? 'Éditer l\'entreprise' : 'Nouvelle Entreprise'}</h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                   {logoPreview ? (
                      <div className="relative w-16 h-16 rounded overflow-hidden border">
                         <img src={logoPreview} alt="Preview" className="object-cover w-full h-full" />
                      </div>
                   ) : (
                      <div className="w-16 h-16 rounded bg-gray-100 border border-dashed flex items-center justify-center text-gray-400 text-xs">
                         Vide
                      </div>
                   )}
                   <Input type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise *
                </label>
                <Input {...register('name')} placeholder="Nom officiel" />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code (Optionnel)
                </label>
                <Input {...register('code')} placeholder="Ex: PRB" />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input {...register('description')} placeholder="Activités..." />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset();
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
