'use client';

import React, { useState } from 'react';
import { useMateriel, useDeleteMateriel, useCreateMateriel, useUpdateMateriel } from '@/hooks/useTechnical';
import { Materiel } from '@/shared/api/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Search, Wrench, AlertTriangle, CheckCircle, Edit, Trash2, Printer } from 'lucide-react';
import { MaterielForm } from '@/components/technical/MaterielForm';

const statusColors: Record<string, { label: string; className: string; icon: any }> = {
  DISPONIBLE: { label: 'Disponible', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle },
  EN_UTILISATION: { label: 'En utilisation', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Package },
  EN_MAINTENANCE: { label: 'Maintenance', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: Wrench },
  HORS_SERVICE: { label: 'Hors service', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: AlertTriangle },
};

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedMateriel, setSelectedMateriel] = useState<Materiel | undefined>();

  const { data: materiel = [], isLoading } = useMateriel({
    query: searchQuery,
    pageSize: 100,
  });
  const deleteMutation = useDeleteMateriel();
  const createMutation = useCreateMateriel();
  const updateMutation = useUpdateMateriel();

  const handleDelete = (id: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce materiel ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedMateriel(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: Materiel) => {
    setSelectedMateriel(item);
    setShowForm(true);
  };

  const handleSubmit = (data: Partial<Materiel>) => {
    if (selectedMateriel) {
      updateMutation.mutate({ id: selectedMateriel.id, data }, {
        onSuccess: () => {
          setShowForm(false);
          setSelectedMateriel(undefined);
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

  const filteredMateriel = statusFilter
    ? materiel.filter((item) => (item.statut || item.status) === statusFilter)
    : materiel;

  const getStatusBadge = (status: string) => {
    const badge = statusColors[status] || statusColors.DISPONIBLE;
    const Icon = badge.icon;
    return (
      <Badge className={`${badge.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </Badge>
    );
  };

  const isStockAlert = (item: Materiel) => {
    const available = item.availableQuantity ?? item.quantiteDisponible ?? item.quantiteStock ?? 0;
    return available <= item.seuilAlerte;
  };

  // Calcul des stats
  const stats = {
    total: filteredMateriel.length,
    disponible: filteredMateriel.filter(m => (m.statut || m.status) === 'DISPONIBLE').length,
    enMaintenance: filteredMateriel.filter(m => (m.statut || m.status) === 'EN_MAINTENANCE').length,
    alertes: filteredMateriel.filter(m => isStockAlert(m)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Parc Materiel</h1>
          <p className="text-muted-foreground mt-2">
            Gestion du materiel technique et equipements
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Nouveau Materiel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Equipements</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{stats.disponible}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Maintenance</p>
              <p className="text-2xl font-bold text-orange-600">{stats.enMaintenance}</p>
            </div>
            <Wrench className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Alertes Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.alertes}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un equipement..."
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">Tous les statuts</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="EN_UTILISATION">En utilisation</option>
            <option value="EN_MAINTENANCE">Maintenance</option>
            <option value="HORS_SERVICE">Hors service</option>
          </select>
        </div>
      </Card>

      {/* Equipment Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : filteredMateriel.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun materiel trouve
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Nom</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Categorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Stock</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Emplacement</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Prix Unitaire</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriel.map((item) => {
                  const available = item.availableQuantity ?? item.quantiteDisponible ?? 0;
                  const total = item.quantity ?? item.quantiteTotale ?? item.quantiteStock ?? 0;
                  const statusValue = item.statut || item.status || 'DISPONIBLE';

                  return (
                    <tr
                      key={item.id}
                      className={`border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        isStockAlert(item) ? 'bg-red-50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-mono">
                          {item.reference}
                        </code>
                      </td>
                      <td className="py-3 px-4 font-medium">{item.nom || item.name}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          {item.categorie || item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(statusValue)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-semibold ${isStockAlert(item) ? 'text-red-600' : ''}`}>
                            {available}
                          </span>
                          <span className="text-xs text-gray-500">/ {total}</span>
                          {isStockAlert(item) && (
                            <span className="text-xs text-red-600 flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Alerte
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.emplacement || item.emplacementStock || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {item.prixUnitaire !== undefined && item.prixUnitaire !== null
                          ? item.prixUnitaire.toFixed(2)
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" title="Modifier" onClick={() => handleEdit(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" title="Imprimer">
                            <Printer className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      {showForm && (
        <MaterielForm
          materiel={selectedMateriel}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedMateriel(undefined);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
