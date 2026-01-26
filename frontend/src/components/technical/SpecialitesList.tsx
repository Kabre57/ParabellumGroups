'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Specialite } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import SpecialiteForm from './SpecialiteForm';

export default function SpecialitesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialite, setEditingSpecialite] = useState<Specialite | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['specialites', searchTerm],
    queryFn: () => technicalService.getSpecialites({ search: searchTerm, pageSize: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => technicalService.deleteSpecialite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialites'] });
    },
  });

  const handleEdit = (specialite: Specialite) => {
    setEditingSpecialite(specialite);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette spécialité ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSpecialite(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Chargement...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert className="bg-red-50 border-red-200 text-red-800">
          Erreur lors du chargement des spécialités
        </Alert>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Spécialités techniques
          </h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            + Ajouter une spécialité
          </Button>
        </div>

        <div className="mb-4">
          <Input
            type="text"
            placeholder="Rechercher une spécialité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {deleteMutation.isError && (
          <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
            Erreur lors de la suppression
          </Alert>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Code
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Nom
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((specialite) => (
                <tr
                  key={specialite.id}
                  className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {specialite.code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {specialite.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-600 dark:text-gray-400">
                      {specialite.description || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(specialite)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(specialite.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.data?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune spécialité trouvée
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Total: {data?.data?.length || 0} spécialité(s)
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-950 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <SpecialiteForm
              specialite={editingSpecialite}
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
