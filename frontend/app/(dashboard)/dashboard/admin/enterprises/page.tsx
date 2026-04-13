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

  const { data: enterprisesData, isLoading } = useQuery({
    queryKey: ['enterprises', page, search],
    queryFn: () => enterpriseApi.getAll({ page, limit: 10 }),
  });

  const form = useForm<EnterpriseFormData>({
    resolver: zodResolver(enterpriseSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => enterpriseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise créée avec succès');
      setIsModalOpen(false);
      form.reset();
      setSelectedFile(null);
      setLogoPreview('');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: FormData }) =>
      enterpriseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise mise à jour avec succès');
      setIsModalOpen(false);
      setEditingEnterprise(null);
      form.reset();
      setSelectedFile(null);
      setLogoPreview('');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => enterpriseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      toast.success('Entreprise supprimée avec succès');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const onSubmit = (values: EnterpriseFormData) => {
    const formData = new FormData();
    formData.append('name', values.name);
    if (values.code) formData.append('code', values.code);
    if (values.description) formData.append('description', values.description);
    if (selectedFile) formData.append('logo', selectedFile);

    if (editingEnterprise) {
      updateMutation.mutate({ id: editingEnterprise.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (enterprise: Enterprise) => {
    setEditingEnterprise(enterprise);
    form.reset({
      name: enterprise.name,
      code: enterprise.code || '',
      description: enterprise.description || '',
    });
    setLogoPreview(enterprise.logoUrl || '');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des Entreprises</h1>
        <Button onClick={() => {
          setEditingEnterprise(null);
          form.reset({ name: '', code: '', description: '' });
          setLogoPreview('');
          setIsModalOpen(true);
        }}>
          Nouvelle Entreprise
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Rechercher une entreprise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Chargement...</p>
        ) : (
          enterprisesData?.data.map((enterprise: Enterprise) => (
            <div key={enterprise.id} className="bg-white p-6 rounded-lg shadow-md border space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border">
                  {enterprise.logoUrl ? (
                    <Image
                      src={enterprise.logoUrl}
                      alt={enterprise.name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">
                      {enterprise.name[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{enterprise.name}</h3>
                  <p className="text-sm text-gray-500">{enterprise.code || 'Pas de code'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 min-h-[3rem]">
                {enterprise.description || 'Aucune description'}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(enterprise)}>
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Supprimer cette entreprise ?')) {
                      deleteMutation.mutate(enterprise.id);
                    }
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">
              {editingEnterprise ? 'Modifier l\'entreprise' : 'Nouvelle Entreprise'}
            </h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border">
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs text-center p-1">Aucun logo</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <Input {...form.register('name')} placeholder="Nom de l'entreprise" />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <Input {...form.register('code')} placeholder="Ex: PRG, PBL..." />
                {form.formState.errors.code && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...form.register('description')}
                  className="w-full border rounded-md p-2 text-sm"
                  rows={3}
                  placeholder="Description de l'entreprise..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEnterprise ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
