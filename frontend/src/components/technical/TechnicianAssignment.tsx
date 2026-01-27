'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Technicien } from '@/shared/api/services/technical'; // Changé Technician -> Technicien
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';

interface TechnicianAssignmentProps {
  missionNum: string;
  onSuccess?: () => void;
}

export default function TechnicianAssignment({
  missionNum,
  onSuccess,
}: TechnicianAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      return await technicalService.getTechniciens({ pageSize: 100 }); // Changé getTechnicians -> getTechniciens
    },
  });

  const assignMutation = useMutation({
    mutationFn: (technicianIds: string[]) => {
      // Pour chaque technicien sélectionné, appeler assignTechnicienToMission
      // Note: Vous pourriez vouloir créer une méthode bulk si disponible
      const promises = technicianIds.map(technicienId => 
        technicalService.assignTechnicienToMission(missionNum, technicienId)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission', missionNum] });
      setSelectedTechnicians([]);
      if (onSuccess) onSuccess();
    },
  });

  const toggleTechnician = (technicianId: string) => {
    setSelectedTechnicians((prev) =>
      prev.includes(technicianId)
        ? prev.filter((id) => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  const handleAssign = () => {
    if (selectedTechnicians.length > 0) {
      assignMutation.mutate(selectedTechnicians);
    }
  };

  // Vérifier si un technicien est disponible
  const isAvailable = (technicien: Technicien) => {
    return technicien.status === 'AVAILABLE';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Assigner des techniciens
      </h2>

      {assignMutation.isError && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          Une erreur est survenue lors de l'assignation des techniciens
        </Alert>
      )}

      {assignMutation.isSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
          Techniciens assignés avec succès
        </Alert>
      )}

      <div className="space-y-4">
        {/* Liste des techniciens disponibles */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Sélectionnez les techniciens à assigner à cette mission
          </p>

          {techniciansData && techniciansData.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {techniciansData.map((technician: Technicien) => (
                <div
                  key={technician.id}
                  onClick={() => toggleTechnician(technician.id)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      selectedTechnicians.includes(technician.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTechnicians.includes(technician.id)}
                          onChange={() => toggleTechnician(technician.id)}
                          className="w-4 h-4"
                        />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {technician.nom} {technician.prenom} {/* Changé firstName/lastName -> nom/prenom */}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                        {technician.email}
                      </p>
                      {technician.specialite && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 ml-6">
                          Spécialité: {technician.specialite.nom} {/* Accès à la spécialité */}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAvailable(technician) ? (
                        <Badge variant="success">Disponible</Badge>
                      ) : (
                        <Badge variant="warning">Non disponible</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              Aucun technicien disponible
            </p>
          )}
        </div>

        {/* Récapitulatif sélection */}
        {selectedTechnicians.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedTechnicians.length} technicien(s) sélectionné(s)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={handleAssign}
            disabled={
              selectedTechnicians.length === 0 || assignMutation.isPending
            }
            className="flex-1"
          >
            {assignMutation.isPending
              ? 'Assignation...'
              : `Assigner ${selectedTechnicians.length > 0 ? `(${selectedTechnicians.length})` : ''}`}
          </Button>
          {selectedTechnicians.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setSelectedTechnicians([])}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}