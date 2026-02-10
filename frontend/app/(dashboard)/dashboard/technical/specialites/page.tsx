'use client';

import React, { useState } from 'react';
import { useSpecialites, useDeleteSpecialite, useCreateSpecialite, useUpdateSpecialite } from '@/hooks/useTechnical';
import { Specialite } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Printer } from 'lucide-react';
import { SpecialiteForm } from '@/components/technical/SpecialiteForm';

export default function SpecialitesPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSpecialite, setSelectedSpecialite] = useState<Specialite | undefined>();

  const { data: specialites = [], isLoading } = useSpecialites();
  const deleteMutation = useDeleteSpecialite();
  const createMutation = useCreateSpecialite();
  const updateMutation = useUpdateSpecialite();

  // S'assurer que specialites est un tableau
  const specialitesArray = Array.isArray(specialites) ? specialites : [];

  const filteredSpecialites = specialitesArray.filter((spec: Specialite) =>
    spec.nom?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette spécialité ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedSpecialite(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: Specialite) => {
    setSelectedSpecialite(item);
    setShowForm(true);
  };

  const handleSubmit = (data: Partial<Specialite>) => {
    if (selectedSpecialite) {
      updateMutation.mutate({ id: selectedSpecialite.id, data }, {
        onSuccess: () => {
          setShowForm(false);
          setSelectedSpecialite(undefined);
        }
      });
    } else {
      createMutation.mutate(data as any, {
        onSuccess: () => {
          setShowForm(false);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des spécialités...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Spécialités Techniques</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des spécialités des techniciens dans l'enteprise.
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Nouvelle Spécialité
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Rechercher une spécialité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSpecialites.map((specialite: Specialite) => (
              <tr key={specialite.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {specialite.nom}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {specialite.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEdit(specialite)}>
                      <Edit className="w-3 h-3" />
                      Modifier
                    </Button>
                    <Button variant="outline" size="sm" title="Imprimer">
                      <Printer className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(specialite.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSpecialites.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Aucune spécialité trouvée</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Créer la première spécialité
          </Button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SpecialiteForm
          specialite={selectedSpecialite}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedSpecialite(undefined);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
