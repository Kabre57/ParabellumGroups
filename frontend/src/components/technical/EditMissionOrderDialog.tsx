'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MissionOrder } from '@/shared/api/technical';
import { useUpdateMissionOrder } from '@/hooks/useTechnical';

interface EditMissionOrderDialogProps {
  order: MissionOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const VEHICLE_OPTIONS = [
  { value: 'VEHICULE_DE_SERVICE', label: 'Vehicule de service' },
  { value: 'VEHICULE_DE_TRANSPORT', label: 'Vehicule de transport' },
];

export function EditMissionOrderDialog({ order, isOpen, onClose }: EditMissionOrderDialogProps) {
  const updateMissionOrder = useUpdateMissionOrder();
  const [form, setForm] = useState({
    pieceIdentite: '',
    fonction: '',
    qualite: '',
    vehiculeType: 'VEHICULE_DE_SERVICE' as 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT',
    vehiculeLabel: '',
    destination: '',
    objetMission: '',
    notes: '',
  });

  useEffect(() => {
    if (!order) return;
    setForm({
      pieceIdentite: order.pieceIdentite || '',
      fonction: order.fonction || '',
      qualite: order.qualite || '',
      vehiculeType: order.vehiculeType || 'VEHICULE_DE_SERVICE',
      vehiculeLabel: order.vehiculeLabel || '',
      destination: order.destination || '',
      objetMission: order.objetMission || '',
      notes: order.notes || '',
    });
  }, [order]);

  const isSubmitting = updateMissionOrder.isPending;

  const handleSubmit = async () => {
    if (!order?.id) return;
    if (!form.destination.trim() || !form.objetMission.trim()) {
      toast.error('Destination et objet de la mission sont requis');
      return;
    }

    try {
      await updateMissionOrder.mutateAsync({
        id: order.id,
        data: {
          pieceIdentite: form.pieceIdentite,
          fonction: form.fonction,
          qualite: form.qualite,
          vehiculeType: form.vehiculeType,
          vehiculeLabel: form.vehiculeLabel,
          destination: form.destination,
          objetMission: form.objetMission,
          notes: form.notes,
        },
      });
      toast.success('Ordre de mission mis a jour');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Impossible de mettre a jour l'ordre de mission");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;ordre de mission</DialogTitle>
          <DialogDescription>
            Ajuste les informations nominatives et le contenu de l&apos;ordre avant impression ou export PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Pièce d&apos;identité</span>
            <input
              value={form.pieceIdentite}
              onChange={(e) => setForm((prev) => ({ ...prev, pieceIdentite: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Fonction</span>
            <input
              value={form.fonction}
              onChange={(e) => setForm((prev) => ({ ...prev, fonction: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">En Qualité de</span>
            <input
              value={form.qualite}
              onChange={(e) => setForm((prev) => ({ ...prev, qualite: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Type de vehicule</span>
            <select
              value={form.vehiculeType}
              onChange={(e) => setForm((prev) => ({ ...prev, vehiculeType: e.target.value as 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT' }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {VEHICLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Moyen de transport affiché</span>
            <input
              value={form.vehiculeLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, vehiculeLabel: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">De se rendre en mission à</span>
            <input
              value={form.destination}
              onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Objet de la mission</span>
            <textarea
              rows={3}
              value={form.objetMission}
              onChange={(e) => setForm((prev) => ({ ...prev, objetMission: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
