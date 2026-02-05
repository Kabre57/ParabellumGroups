'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { technicalService, RapportIntervention } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface RapportInterventionViewProps {
  rapportId: string;
  onClose?: () => void;
}

export default function RapportInterventionView({ rapportId, onClose }: RapportInterventionViewProps) {
  const { data: rapport, isLoading, error } = useQuery({
    queryKey: ['rapport', rapportId],
    queryFn: () => technicalService.getRapport(rapportId) as Promise<RapportIntervention>,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadPDF = () => {
    window.open(`/api/technical/rapports/${rapportId}/pdf`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Chargement du rapport...</p>
      </Card>
    );
  }

  if (error || !rapport) {
    return (
      <Card className="p-6">
        <Alert className="bg-red-50 border-red-200 text-red-800">
          Erreur lors du chargement du rapport
        </Alert>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Fermer
          </Button>
        )}
      </Card>
    );
  }

  const createdAt = rapport.createdAt || rapport.dateCreation;
  const updatedAt = rapport.updatedAt || rapport.dateModification || createdAt;

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Rapport d'intervention
            </h2>
            <p className="text-sm text-gray-500">Cree le {formatDate(createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}>
              Telecharger PDF
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Informations intervention */}
      {rapport.intervention && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Informations de l'intervention
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Mission</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {rapport.intervention.mission?.title || rapport.intervention.missionNum}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Technicien</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {rapport.intervention.technician
                  ? `${rapport.intervention.technician.firstName} ${rapport.intervention.technician.lastName}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date d'intervention</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(rapport.intervention.dateDebut || rapport.intervention.scheduledDate || rapport.intervention.date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Horaires</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {rapport.intervention.startTime?.substring(0, 5)}
                {rapport.intervention.endTime && ` - ${rapport.intervention.endTime.substring(0, 5)}`}
              </p>
            </div>
            {rapport.intervention.estimatedDuration && (
              <div>
                <p className="text-sm text-gray-500">Duree estimee</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {rapport.intervention.estimatedDuration}h
                </p>
              </div>
            )}
            {rapport.intervention.actualDuration && (
              <div>
                <p className="text-sm text-gray-500">Duree reelle</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {rapport.intervention.actualDuration}h
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Travaux effectues */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Travaux effectues
        </h3>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {rapport.workDone || rapport.contenu}
          </p>
        </div>
      </Card>

      {/* Problemes rencontres */}
      {rapport.issuesFound && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Problemes rencontres
          </h3>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {rapport.issuesFound}
            </p>
          </div>
        </Card>
      )}

      {/* Recommandations */}
      {rapport.recommendations && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Recommandations
          </h3>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {rapport.recommendations}
            </p>
          </div>
        </Card>
      )}

      {/* Galerie photos */}
      {rapport.photos && rapport.photos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Photos ({rapport.photos.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rapport.photos.map((photo, index) => (
              <div key={index} className="group relative">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(photo, '_blank')}
                />
                <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  Photo {index + 1}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Cliquez sur une photo pour l'agrandir
          </p>
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">ID du rapport</p>
            <p className="font-mono text-gray-900 dark:text-white">{rapport.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Derniere modification</p>
            <p className="text-gray-900 dark:text-white">
              {formatDate(updatedAt)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
