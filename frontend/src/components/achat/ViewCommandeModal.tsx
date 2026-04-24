
"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { procurementService } from "@/services/procurement";
import PurchaseOrderPrint from "@/components/printComponents/PurchaseOrderPrint";
import { inventoryService } from "@/shared/api/inventory/inventory.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
}

export function ViewCommandeModal({ isOpen, onClose, order }: Props) {
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const formatArticleUnit = (unit?: string | null) => {
    switch (unit) {
      case "PIECE":
        return "Piece";
      case "KG":
        return "Kg";
      case "M":
        return "Metre";
      case "L":
        return "Litre";
      default:
        return unit || "—";
    }
  };
  const { data: fullOrderResponse } = useQuery({
    queryKey: ["purchase-order-modal-detail", order?.id],
    queryFn: () => procurementService.getOrder(order?.id || ""),
    enabled: isOpen && Boolean(order?.id),
    staleTime: 60 * 1000,
  });
  const effectiveOrder = fullOrderResponse?.data || order;
  const { data: articlesResponse } = useQuery({
    queryKey: ["purchase-order-view-articles"],
    queryFn: () => inventoryService.getArticles(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const lines = effectiveOrder?.itemsDetail || effectiveOrder?.lignes || [];
  const articleMap = new Map((articlesResponse?.data || []).map((article: any) => [article.id, article]));
  const supplierName = effectiveOrder?.supplier || effectiveOrder?.supplierName || "";

  const handlePrint = () => {
    if (!effectiveOrder) return;
    setIsPrintOpen(true);
  };

  if (!isOpen || !effectiveOrder) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
        <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Commande {effectiveOrder.number || ""}</h3>
            <p className="text-sm text-muted-foreground">Détails et impression</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-3 md:grid-cols-2 text-sm mb-4">
            <div>
              <div className="text-muted-foreground">Fournisseur</div>
              <div className="font-semibold">{supplierName || "—"}</div>
              {effectiveOrder?.supplierEmail && (
                <div className="text-xs text-muted-foreground">{effectiveOrder.supplierEmail}</div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-semibold">
                {effectiveOrder?.date
                  ? new Date(effectiveOrder.date).toLocaleDateString("fr-FR")
                  : effectiveOrder?.createdAt
                  ? new Date(effectiveOrder.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Statut</div>
              <div className="font-semibold">{effectiveOrder?.status || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Montant</div>
              <div className="font-semibold">
                {(effectiveOrder?.amount ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Désignation</th>
                  <th className="px-4 py-3 font-medium">Qté</th>
                  <th className="px-4 py-3 font-medium">Unité</th>
                  <th className="px-4 py-3 font-medium">PU</th>
                  <th className="px-4 py-3 font-medium">TVA %</th>
                  <th className="px-4 py-3 font-medium">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item: any) => (
                  <tr key={item.id || item.designation} className="border-t">
                    <td className="px-4 py-3">{item.designation}</td>
                    <td className="px-4 py-3">{item.quantity ?? item.quantite}</td>
                    <td className="px-4 py-3">
                      {formatArticleUnit(item.unite || (item.articleId ? articleMap.get(item.articleId)?.unite : null))}
                    </td>
                    <td className="px-4 py-3">
                      {(item.unitPrice ?? item.prixUnitaire ?? 0).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      F
                    </td>
                    <td className="px-4 py-3">{item.tva ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      {(item.amount ?? item.montantTTC ?? 0).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      F
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Aucune ligne disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Sous-total HT</span>
              <span>
                {lines
                  .reduce((sum: number, item: any) => {
                    const ht =
                      item.montantHT ??
                      (item.unitPrice ?? item.prixUnitaire ?? 0) * (item.quantity ?? item.quantite ?? 0);
                    return sum + ht;
                  }, 0)
                  .toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                F
              </span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span>
                {lines
                  .reduce((sum: number, item: any) => {
                    const ht =
                      item.montantHT ??
                      (item.unitPrice ?? item.prixUnitaire ?? 0) * (item.quantity ?? item.quantite ?? 0);
                    const ttc = item.montantTTC ?? item.amount ?? ht;
                    return sum + (ttc - ht);
                  }, 0)
                  .toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                F
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total TTC</span>
              <span>
                {(effectiveOrder?.amount ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {isPrintOpen && (
        <PurchaseOrderPrint
          order={effectiveOrder}
          articles={articlesResponse?.data || []}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </>
  );
}
