'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Truck } from 'lucide-react';
import { procurementService } from '@/services/procurement';
import type { PurchaseOrderStatus, Supplier } from '@/services/procurement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

type LineItem = {
  designation: string;
  quantite: number;
  prixUnitaire: number;
};

const statusOptions: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'CONFIRME', label: 'Réception reçue' },
  { value: 'LIVRE', label: 'Réception vérifiée' },
];

export default function NouvelleReceptionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery<
    Awaited<ReturnType<typeof procurementService.getSuppliers>>
  >({
    queryKey: ['suppliers'],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });

  const suppliers: Supplier[] = suppliersResponse?.data ?? [];

  const [supplierId, setSupplierId] = useState<string>('');
  const [status, setStatus] = useState<PurchaseOrderStatus>('CONFIRME');
  const [lines, setLines] = useState<LineItem[]>([
    { designation: '', quantite: 1, prixUnitaire: 0 },
  ]);

  const totalAmount = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + (Number(line.quantite) || 0) * (Number(line.prixUnitaire) || 0),
        0
      ),
    [lines]
  );

  const createReception = useMutation({
    mutationFn: async () => {
      if (!supplierId) {
        throw new Error('Sélectionnez un fournisseur');
      }
      if (!lines.length || !lines.every((l) => l.designation && l.quantite > 0)) {
        throw new Error('Ajoutez au moins une ligne valide');
      }

      const order = await procurementService.createOrder({
        fournisseurId: supplierId,
        montantTotal: totalAmount,
        status,
      });

      // Ajout des lignes si présentes
      const orderId = order.data.id;
      await Promise.all(
        lines.map((line) =>
          procurementService.addOrderLine(orderId, {
            designation: line.designation,
            quantite: Number(line.quantite),
            prixUnitaire: Number(line.prixUnitaire),
          })
        )
      );

      // Mettre à jour le statut final si nécessaire
      if (status === 'LIVRE') {
        await procurementService.updateOrderStatus(orderId, 'LIVRE', 'validate');
      } else if (status === 'CONFIRME') {
        await procurementService.updateOrderStatus(orderId, 'CONFIRME', 'validate');
      }

      return order;
    },
    onSuccess: () => {
      toast.success('Réception créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['receptions'] });
      router.push('/dashboard/achats/receptions');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création de la réception');
    },
  });

  const updateLine = (index: number, key: keyof LineItem, value: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [key]: key === 'designation' ? value : Number(value),
      };
      return copy;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { designation: '', quantite: 1, prixUnitaire: 0 }]);

  const removeLine = (index: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats/receptions">Retour aux réceptions</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Nouvelle réception</h1>
          <p className="text-sm text-muted-foreground">
            Enregistrez la réception d&apos;un bon de commande et ses lignes.
          </p>
        </div>
        <Button onClick={() => createReception.mutate()} disabled={createReception.isPending}>
          {createReception.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de la réception</CardTitle>
          <CardDescription>Sélectionnez le fournisseur et le statut initial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fournisseur</label>
              {suppliersLoading ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Spinner className="mr-2 h-4 w-4" /> Chargement...
                </div>
              ) : (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Choisir un fournisseur</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name || supplier.nom || supplier.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Lignes reçues</CardTitle>
            <CardDescription>Détail des produits ou services reçus.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr,1fr,1fr,auto]"
            >
              <Input
                placeholder="Désignation"
                value={line.designation}
                onChange={(e) => updateLine(index, 'designation', e.target.value)}
              />
              <Input
                type="number"
                min="1"
                value={line.quantite}
                onChange={(e) => updateLine(index, 'quantite', e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.prixUnitaire}
                onChange={(e) => updateLine(index, 'prixUnitaire', e.target.value)}
              />
              <div className="flex items-center justify-end gap-2">
                <div className="text-sm font-medium">
                  {(line.quantite * line.prixUnitaire || 0).toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  F
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() => removeLine(index)}
                  aria-label="Supprimer la ligne"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-end text-sm font-medium">
            Total : {totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
