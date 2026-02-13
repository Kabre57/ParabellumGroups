'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  User,
  Package,
  MapPin,
  AlertCircle,
  UserPlus,
  PackagePlus,
  Printer,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import { AddTechnicianModal } from '@/components/technical/AddTechnicianModal';
import { AddMaterielModal } from '@/components/technical/AddMaterielModal';

const statusColors: Record<string, string> = {
  PLANIFIEE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  EN_COURS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  TERMINEE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  ANNULEE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

const prioriteColors: Record<string, string> = {
  BASSE: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  MOYENNE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  HAUTE: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  URGENTE: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

export default function InterventionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const interventionId = params.id as string;

  const [showAddTechnicianModal, setShowAddTechnicianModal] = useState(false);
  const [showAddMaterielModal, setShowAddMaterielModal] = useState(false);

  const { data: interventionData, isLoading } = useQuery({
    queryKey: ['intervention', interventionId],
    queryFn: async () => {
      const response = await technicalService.getIntervention(interventionId);
      return (response as any)?.data ?? response;
    },
    enabled: !!interventionId,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['intervention', interventionId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!interventionData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Intervention non trouvée
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                L'intervention demandée n'existe pas ou a été supprimée.
              </p>
            </div>
          </div>
        </div>
        <Link href="/dashboard/technical/interventions">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux interventions
          </Button>
        </Link>
      </div>
    );
  }

  const intervention = interventionData;
  const techniciens = intervention.techniciens || [];
  const materiels = intervention.materielUtilise || [];
  const technicienIds = techniciens.map((t: any) => t.technicien?.id || t.technicienId);
  const firstTechnicienId = technicienIds[0];

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/technical/interventions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {intervention.titre}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Intervention #{intervention.id?.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={statusColors[intervention.status]}>
            {intervention.status}
          </Badge>
          {intervention.priorite && (
            <Badge className={prioriteColors[intervention.priorite]}>
              {intervention.priorite}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/technical/interventions`)}>
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </Button>
        <Button variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      </div>

      {/* Informations générales */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Informations Générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mission</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {intervention.mission?.numeroMission} - {intervention.mission?.titre || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date de début</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(intervention.dateDebut)}
              </p>
            </div>
          </div>
          {intervention.dateFin && (
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date de fin</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDate(intervention.dateFin)}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Durée estimée / réelle</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDuration(intervention.dureeEstimee)}
                {intervention.dureeReelle && ` / ${formatDuration(intervention.dureeReelle)}`}
              </p>
            </div>
          </div>
          {intervention.mission?.adresse && (
            <div className="flex items-start space-x-3 col-span-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {intervention.mission.adresse}
                </p>
              </div>
            </div>
          )}
        </div>
        {intervention.description && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</p>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {intervention.description}
            </p>
          </div>
        )}
      </div>

      {/* Techniciens assignés */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Techniciens Assignés ({techniciens.length})
          </h2>
          {intervention.status !== 'TERMINEE' && intervention.status !== 'ANNULEE' && (
            <Button
              size="sm"
              onClick={() => setShowAddTechnicianModal(true)}
              className="flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter Technicien
            </Button>
          )}
        </div>
        {techniciens.length > 0 ? (
          <div className="space-y-3">
            {techniciens.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.technicien?.prenom} {item.technicien?.nom}
                    </p>
                    {item.technicien?.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.technicien.email}
                      </p>
                    )}
                  </div>
                </div>
                {item.role && (
                  <Badge variant="outline">
                    {item.role}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun technicien assigné
          </div>
        )}
      </div>

      {/* Matériel utilisé */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Package className="w-5 h-5 mr-2 text-green-600" />
            Matériel Utilisé ({materiels.length})
          </h2>
          {intervention.status !== 'TERMINEE' && intervention.status !== 'ANNULEE' && (
            <Button
              size="sm"
              onClick={() => {
                if (!firstTechnicienId) {
                  toast.error('Veuillez d\'abord ajouter au moins un technicien');
                  return;
                }
                setShowAddMaterielModal(true);
              }}
              className="flex items-center bg-green-600 hover:bg-green-700"
              disabled={!firstTechnicienId}
            >
              <PackagePlus className="w-4 h-4 mr-2" />
              Ajouter Matériel
            </Button>
          )}
        </div>
        {materiels.length > 0 ? (
          <div className="space-y-3">
            {materiels.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.materiel?.nom}
                    {item.materiel?.reference && (
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({item.materiel.reference})
                      </span>
                    )}
                  </p>
                  {item.technicien && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Retiré par : {item.technicien.prenom} {item.technicien.nom}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {item.notes}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Qté : {item.quantite}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun matériel utilisé
          </div>
        )}
      </div>

      {/* Modales */}
      <AddTechnicianModal
        isOpen={showAddTechnicianModal}
        onClose={() => setShowAddTechnicianModal(false)}
        interventionId={interventionId}
        existingTechnicienIds={technicienIds}
        onSuccess={handleRefresh}
      />

      {firstTechnicienId && (
        <AddMaterielModal
          isOpen={showAddMaterielModal}
          onClose={() => setShowAddMaterielModal(false)}
          interventionId={interventionId}
          existingMateriels={materiels}
          technicienId={firstTechnicienId}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
