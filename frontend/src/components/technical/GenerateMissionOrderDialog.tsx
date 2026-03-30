'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateMissionOrder, useCreateMissionOrdersBatch } from '@/hooks/useTechnical';

interface GenerateMissionOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mission: any;
  intervention: any;
  techniciens: any[];
  onGenerated?: (orders: any[]) => void;
}

const VEHICLE_OPTIONS = [
  { value: 'VEHICULE_DE_SERVICE', label: 'Vehicule de service' },
  { value: 'VEHICULE_DE_TRANSPORT', label: 'Vehicule de transport' },
];

export function GenerateMissionOrderDialog({
  isOpen,
  onClose,
  mission,
  intervention,
  techniciens,
  onGenerated,
}: GenerateMissionOrderDialogProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedTechnicienId, setSelectedTechnicienId] = useState('');
  const [pieceIdentite, setPieceIdentite] = useState('');
  const [fonction, setFonction] = useState('');
  const [qualite, setQualite] = useState(intervention?.titre || 'TECHNICIEN D INTERVENTION');
  const [vehiculeType, setVehiculeType] = useState<'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT'>('VEHICULE_DE_SERVICE');
  const [vehiculeLabel, setVehiculeLabel] = useState('Vehicule de service');
  const [destination, setDestination] = useState(mission?.adresse || '');
  const [objetMission, setObjetMission] = useState(intervention?.titre || mission?.description || mission?.titre || '');
  const [notes, setNotes] = useState('');

  const createOrderMutation = useCreateMissionOrder();
  const createBatchMutation = useCreateMissionOrdersBatch();

  useEffect(() => {
    setQualite(intervention?.titre || 'TECHNICIEN D INTERVENTION');
    setDestination(mission?.adresse || '');
    setObjetMission(intervention?.titre || mission?.description || mission?.titre || '');
    setPieceIdentite('');
    setFonction('');
    setSelectedTechnicienId('');
  }, [intervention?.id, intervention?.titre, mission?.adresse, mission?.description, mission?.titre]);

  const availableTechniciens = useMemo(
    () =>
      (techniciens || [])
        .map((assignment: any) => ({
          technicien: assignment.technicien,
          role: assignment.role,
        }))
        .filter((item: any) => item.technicien?.id),
    [techniciens],
  );

  const isSubmitting = createOrderMutation.isPending || createBatchMutation.isPending;

  const handleVehicleTypeChange = (value: 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT') => {
    setVehiculeType(value);
    setVehiculeLabel(value === 'VEHICULE_DE_TRANSPORT' ? 'Vehicule de transport' : 'Vehicule de service');
  };

  const handleSubmit = async () => {
    if (!mission?.id || !intervention?.id) {
      toast.error("Mission ou intervention introuvable");
      return;
    }

    if (availableTechniciens.length === 0) {
      toast.error("Aucun technicien affecte a cette intervention");
      return;
    }

    try {
      if (mode === 'batch') {
        const response = await createBatchMutation.mutateAsync({
          interventionId: intervention.id,
          vehiculeType,
          vehiculeLabel,
          qualite,
          destination,
          objetMission,
          notes,
        });
        toast.success(`${response.data?.length || 0} ordre(s) de mission generes`);
        onGenerated?.(response.data || []);
      } else {
        if (!selectedTechnicienId) {
          toast.error("Veuillez selectionner un technicien");
          return;
        }
        const response = await createOrderMutation.mutateAsync({
          missionId: mission.id,
          interventionId: intervention.id,
          technicienId: selectedTechnicienId,
          pieceIdentite,
          fonction,
          qualite,
          vehiculeType,
          vehiculeLabel,
          destination,
          objetMission,
          notes,
        });
        toast.success('Ordre de mission genere');
        onGenerated?.(response.data ? [response.data] : []);
      }

      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Impossible de generer l'ordre de mission");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Generer des ordres de mission</DialogTitle>
          <DialogDescription>
            Cree un ordre nominatif pour un technicien ou en lot pour toute l&apos;intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Mode de generation</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'single' | 'batch')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="single">Un technicien</option>
                <option value="batch">Tous les techniciens affectes</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Type de vehicule</span>
              <select
                value={vehiculeType}
                onChange={(e) => handleVehicleTypeChange(e.target.value as 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {VEHICLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {mode === 'single' && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 block md:col-span-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Technicien destinataire</span>
                <select
                  value={selectedTechnicienId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const selected = availableTechniciens.find((item: any) => item.technicien.id === nextId);
                    setSelectedTechnicienId(nextId);
                    setPieceIdentite(selected?.technicien?.matricule || selected?.technicien?.employeeNumber || '');
                    setFonction(selected?.technicien?.specialite?.nom || selected?.technicien?.poste || '');
                    setQualite(selected?.role || intervention?.titre || 'TECHNICIEN D INTERVENTION');
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Selectionner un technicien</option>
                  {availableTechniciens.map((item: any) => (
                    <option key={item.technicien.id} value={item.technicien.id}>
                      {[item.technicien.prenom, item.technicien.nom].filter(Boolean).join(' ')}{item.role ? ` - ${item.role}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Pièce d&apos;identité</span>
                <input
                  value={pieceIdentite}
                  onChange={(e) => setPieceIdentite(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Fonction</span>
                <input
                  value={fonction}
                  onChange={(e) => setFonction(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-900 dark:text-white">En Qualité de</span>
              <input
                value={qualite}
                onChange={(e) => setQualite(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Libelle vehicule</span>
              <input
                value={vehiculeLabel}
                onChange={(e) => setVehiculeLabel(e.target.value)}
                placeholder="Ex: Vehicule de service / Mini-bus / Taxi"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label className="space-y-2 block md:col-span-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">De se rendre en mission à</span>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label className="space-y-2 block md:col-span-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Objet de la mission</span>
              <textarea
                value={objetMission}
                onChange={(e) => setObjetMission(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label className="space-y-2 block md:col-span-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informations complementaires pour l'ordre de mission"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
            <div className="font-medium text-gray-900 dark:text-white">{mission?.numeroMission} - {mission?.titre}</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400">{intervention?.titre}</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400">{availableTechniciens.length} technicien(s) affecte(s)</div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {mode === 'batch' ? 'Generer en lot' : 'Generer l ordre'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
