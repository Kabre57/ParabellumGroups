
"use client";
import React from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order?: any;
}

export function ViewCommandeModal({ isOpen, onClose, order }: Props) {
  const lines = order?.itemsDetail || order?.lignes || [];
  const supplierName = order?.supplier || order?.supplierName || "";

  const handlePrint = () => {
    if (!order) return;
    window.print();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Commande {order.number || ""}</h3>
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
              {order?.supplierEmail && (
                <div className="text-xs text-muted-foreground">{order.supplierEmail}</div>
              )}
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-semibold">
                {order?.date
                  ? new Date(order.date).toLocaleDateString("fr-FR")
                  : order?.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("fr-FR")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Statut</div>
              <div className="font-semibold">{order?.status || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Montant</div>
              <div className="font-semibold">
                {(order?.amount ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Désignation</th>
                  <th className="px-4 py-3 font-medium">Qté</th>
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
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
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
                {(order?.amount ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
