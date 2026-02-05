'use client';

import React, { useState } from 'react';
import { useTechniciens, useDeleteTechnicien, useCreateTechnicien, useUpdateTechnicien } from '@/hooks/useTechnical';
import { Technicien } from '@/shared/api/services/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Phone, Mail, Award, Printer } from 'lucide-react';
import Link from 'next/link';
import { TechnicienForm } from '@/components/technical/TechnicienForm';
import { CreateTechnicienModal } from '@/components/technical/CreateTechnicienModal';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  ON_MISSION: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  ON_LEAVE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  SICK: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  TRAINING: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponible',
  ON_MISSION: 'En mission',
  ON_LEAVE: 'En conge',
  SICK: 'Malade',
  TRAINING: 'Formation',
};

export default function TechniciensPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTechnicien, setSelectedTechnicien] = useState<Technicien | undefined>();

  const { data: techniciens = [], isLoading, error } = useTechniciens({ pageSize: 100 });
  const deleteMutation = useDeleteTechnicien();
  const createMutation = useCreateTechnicien();
  const updateMutation = useUpdateTechnicien();

  const filteredTechniciens = techniciens.filter((tech: Technicien) => {
    const matchesSearch =
      tech.nom?.toLowerCase().includes(search.toLowerCase()) ||
      tech.prenom?.toLowerCase().includes(search.toLowerCase()) ||
      tech.email?.toLowerCase().includes(search.toLowerCase()) ||
      tech.matricule?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || tech.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce technicien ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setSelectedTechnicien(undefined);
    setShowForm(true);
  };

  const handleEdit = (item: Technicien) => {
    setSelectedTechnicien(item);
    setShowForm(true);
  };

  const handleSubmit = (data: Partial<Technicien>) => {
    if (selectedTechnicien) {
      updateMutation.mutate({ id: selectedTechnicien.id, data }, {
        onSuccess: () => {
          setShowForm(false);
          setSelectedTechnicien(undefined);
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setShowForm(false);
        }
      });
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des techniciens...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Erreur lors du chargement des techniciens</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          <p className="text-xs text-gray-500 mt-2">Vérifiez que le service Technical backend est démarré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Techniciens</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion de l'équipe technique
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Nouveau Technicien
        </Button>
      </div>

      <CreateTechnicienModal
        isOpen={showForm && !selectedTechnicien}
        onClose={() => setShowForm(false)}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par nom, email ou matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="BUSY">Occupé</option>
            <option value="ON_LEAVE">En congé</option>
            <option value="INACTIVE">Inactif</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTechniciens.map((technicien: Technicien) => (
          <div
            key={technicien.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {technicien.prenom} {technicien.nom}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {technicien.matricule}
                </p>
              </div>
              <Badge className={statusColors[technicien.status] || 'bg-gray-100 text-gray-800'}>
                {statusLabels[technicien.status] || technicien.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Award className="w-4 h-4" />
                <span>{technicien.specialite?.nom || 'Non spécifié'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span className="truncate">{technicien.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{technicien.telephone}</span>
              </div>
              {technicien.tauxHoraire && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Taux horaire:</span>
                  <span>{formatCurrency(technicien.tauxHoraire)}/h</span>
                </div>
              )}
            </div>

            {technicien.competences && technicien.competences.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Compétences:</p>
                <div className="flex flex-wrap gap-1">
                  {technicien.competences.slice(0, 3).map((comp: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300"
                    >
                      {comp}
                    </span>
                  ))}
                  {technicien.competences.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded dark:bg-gray-700 dark:text-gray-300">
                      +{technicien.competences.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/dashboard/technical/techniciens/${technicien.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" />
                  Voir
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEdit(technicien)}>
                <Edit className="w-3 h-3" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" title="Imprimer">
                <Printer className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(technicien.id)}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredTechniciens.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun technicien trouvé</p>
          <Link href="/dashboard/technical/techniciens/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier technicien
            </Button>
          </Link>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TechnicienForm
          item={selectedTechnicien}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedTechnicien(undefined);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
