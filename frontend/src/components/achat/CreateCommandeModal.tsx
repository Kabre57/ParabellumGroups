"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inventoryService } from "@/shared/api/inventory/inventory.service";
import type { InventoryArticle } from "@/shared/api/inventory/types";
import type { Supplier, PurchaseOrderStatus } from "@/services/procurement";
import { PurchaseLinesGrid, type PurchaseLineDraft } from "@/components/procurement/PurchaseLinesGrid";

export interface CreateCommandePayload {
  fournisseurId: string;
  status: PurchaseOrderStatus;
  lignes: {
    designation: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
    articleId?: string;
    referenceArticle?: string;
    categorie?: string;
    unite?: string;
  }[];
  montantTotal: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  defaultStatus?: PurchaseOrderStatus;
  onSubmit: (payload: CreateCommandePayload) => void;
}

const buildEmptyLine = (): PurchaseLineDraft => ({
  articleId: "",
  designation: "",
  categorie: "",
  unite: "",
  quantite: 1,
  prixUnitaire: 0,
  tva: 0,
});

export function CreateCommandeModal({
  isOpen,
  onClose,
  suppliers,
  defaultStatus = "BROUILLON",
  onSubmit,
}: Props) {
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [status, setStatus] = useState<PurchaseOrderStatus>(defaultStatus);
  const [lines, setLines] = useState<PurchaseLineDraft[]>([buildEmptyLine()]);

  const { data: productsResponse, isFetching: loadingProducts } = useQuery({
    queryKey: ["inventory-articles-for-orders"],
    queryFn: () => inventoryService.getArticles(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const products: InventoryArticle[] = productsResponse?.data ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setFournisseurId(suppliers[0]?.id || "");
    setStatus(defaultStatus);
    setLines([buildEmptyLine()]);
  }, [isOpen, suppliers, defaultStatus]);

  const totals = useMemo(() => {
    const montantHT = lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0);
    const montantTVA = lines.reduce(
      (sum, line) => sum + line.quantite * line.prixUnitaire * (line.tva / 100),
      0
    );
    return {
      ht: montantHT,
      tva: montantTVA,
      ttc: montantHT + montantTVA,
    };
  }, [lines]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const lignes = lines
      .filter((line) => line.designation.trim())
      .map((line) => ({
        designation: line.designation.trim(),
        quantite: Number(line.quantite) || 0,
        prixUnitaire: Number(line.prixUnitaire) || 0,
        tva: Number(line.tva) || 0,
        articleId: line.articleId || undefined,
        categorie: line.categorie || undefined,
        unite: line.unite || undefined,
      }))
      .filter((line) => line.designation && line.quantite > 0);

    onSubmit({ fournisseurId, status, lignes, montantTotal: totals.ttc });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="w-full max-w-[1220px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Nouvelle commande</h3>
            <p className="text-sm text-muted-foreground">
              Saisie type ERP inspirée des devis internes pour une commande fournisseur propre.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          <div className="rounded-xl border bg-slate-50/40 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
              <label className="text-sm font-medium">Fournisseur</label>
              <select
                value={fournisseurId}
                onChange={(event) => setFournisseurId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {suppliers.length === 0 && <option value="">Aucun fournisseur</option>}
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name || supplier.nom || supplier.email || "Sans nom"}
                  </option>
                ))}
              </select>
              </div>
              <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PurchaseOrderStatus)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="BROUILLON">Brouillon</option>
                <option value="ENVOYE">Envoyée</option>
                <option value="CONFIRME">Confirmée</option>
                <option value="LIVRE">Livrée</option>
                <option value="ANNULE">Annulée</option>
              </select>
              </div>
            </div>
          </div>

          <div className="min-h-0 rounded-xl border bg-background p-4">
            <PurchaseLinesGrid
              title="Lignes de commande"
              description="Saisie compacte type ERP pour préparer la commande fournisseur."
              lines={lines}
              articles={products}
              maxBodyHeightClass="min-h-[280px] max-h-[50vh]"
              tableMinWidthClass="min-w-[1080px]"
              onAddLine={() => setLines((current) => [...current, buildEmptyLine()])}
              onDuplicateLine={(index) =>
                setLines((current) => {
                  const source = current[index];
                  return [
                    ...current.slice(0, index + 1),
                    { ...source, id: undefined },
                    ...current.slice(index + 1),
                  ];
                })
              }
              onRemoveLine={(index) =>
                setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)))
              }
              onUpdateLine={(index, patch) =>
                setLines((current) =>
                  current.map((line, idx) => (idx === index ? { ...line, ...patch } : line))
                )
              }
              onSelectArticle={(index, articleId) => {
                const selected = products.find((article) => article.id === articleId);
                setLines((current) =>
                  current.map((line, idx) =>
                    idx === index
                      ? {
                          ...line,
                          articleId,
                          designation: selected?.nom || line.designation,
                          categorie: selected?.categorie || line.categorie,
                          unite: selected?.unite || line.unite,
                          prixUnitaire: Number(selected?.prixAchat ?? selected?.prixVente ?? line.prixUnitaire ?? 0),
                        }
                      : line
                  )
                );
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-1">
            <div className="text-sm text-muted-foreground">
              Total TTC : {totals.ttc.toLocaleString("fr-FR")} F
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={loadingProducts || lines.length === 0}>
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
