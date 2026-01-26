'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { technicalService, Technician } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

export default function TechniciensPage() {
  const [filters, setFilters] = useState({
    specialization: '',
    status: '',
    search: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['technicians', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters.specialization)
        params.filters = { ...params.filters, specialization: filters.specialization };
      if (filters.status) {
        const isAvailable = filters.status === 'available';
        params.filters = { ...params.filters, isAvailable };
      }
      if (filters.search) params.query = filters.search;

      return await technicalService.getTechnicians(params);
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ specialization: '', status: '', search: '' });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Techniciens
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gestion de l'équipe technique
          </p>
        </div>
        <Button>Ajouter un technicien</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
              value={filters.specialization}
              onChange={(e) => handleFilterChange('specialization', e.target.value)}
            >
              <option value="">Toutes les spécialités</option>
              <option value="ELECTRICITE">Électricité</option>
              <option value="PLOMBERIE">Plomberie</option>
              <option value="CHAUFFAGE">Chauffage</option>
              <option value="CLIMATISATION">Climatisation</option>
              <option value="SECURITE">Sécurité</option>
              <option value="INFORMATIQUE">Informatique</option>
            </select>
          </div>
          <div>
            <select
              className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="unavailable">Non disponible</option>
            </select>
          </div>
          <div>
            <Button variant="outline" onClick={resetFilters} className="w-full">
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total techniciens
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {data.pagination.totalItems}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Disponibles
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              {data.data.filter((t: Technician) => t.isAvailable).length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              En mission
            </p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              {data.data.filter((t: Technician) => !t.isAvailable).length}
            </p>
          </Card>
        </div>
      )}

      {/* Technicians table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Erreur lors du chargement des techniciens
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Disponibilité</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((technician: Technician) => (
                  <TableRow
                    key={technician.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <TableCell className="font-medium">
                      {technician.firstName} {technician.lastName}
                    </TableCell>
                    <TableCell>{technician.email}</TableCell>
                    <TableCell>
                      {technician.phoneNumber || 'Non renseigné'}
                    </TableCell>
                    <TableCell>
                      {technician.specialization ? (
                        <Badge variant="outline">
                          {technician.specialization}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">Non spécifié</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            technician.isAvailable
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        ></div>
                        {technician.isAvailable ? (
                          <Badge variant="success">Disponible</Badge>
                        ) : (
                          <Badge variant="warning">En mission</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(technician.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun technicien trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {data.pagination.currentPage} sur {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!data.pagination.hasPrevious}>
              Précédent
            </Button>
            <Button variant="outline" disabled={!data.pagination.hasNext}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
