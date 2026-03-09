"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, List, X, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inventoryService } from "@/shared/api/inventory/inventory.service";
import type { InventoryArticle } from "@/shared/api/inventory/types";
import type { Supplier, PurchaseOrderStatus } from "@/services/procurement";

export interface CreateCommandePayload {
  fournisseurId: string;
  status: PurchaseOrderStatus;
  lignes: {
    designation: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
    articleId?: string;
  }[];
  montantTotal: number;
}

interface OrderLineForm {
  designation: string;
  quantite: string;
  prixUnitaire: string;
  tva: string;
  articleId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  defaultStatus?: PurchaseOrderStatus;
  onSubmit: (payload: CreateCommandePayload) => void;
}

export function CreateCommandeModal({ isOpen, onClose, suppliers, defaultStatus = "BROUILLON", onSubmit }: Props) {
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [status, setStatus] = useState<PurchaseOrderStatus>(defaultStatus);
  const [lines, setLines] = useState<OrderLineForm[]>([
    { designation: "", quantite: "1", prixUnitaire: "0", tva: "0", articleId: "" },
  ]);
  const [productSearch, setProductSearch] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const { data: productsResponse, isFetching: loadingProducts } = useQuery({
    queryKey: ["inventory-articles", productSearch],
    queryFn: () => inventoryService.getArticles({ search: productSearch || undefined }),
    enabled: productModal,
  });
  const products: InventoryArticle[] = productsResponse?.data ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setFournisseurId(suppliers[0]?.id || "");
    setStatus(defaultStatus);
    setLines([{ designation: "", quantite: "1", prixUnitaire: "0", tva: "0", articleId: "" }]);
  }, [isOpen, suppliers, defaultStatus]);

  const totals = useMemo(() => {
    const parsed = lines.map((l) => {
      const q = Number(l.quantite) || 0;
      const pu = Number(l.prixUnitaire) || 0;
      const tva = Number(l.tva) || 0;
      const ht = q * pu;
      const ttc = ht * (1 + tva / 100);
      return { ht, ttc, tvaValue: ttc - ht };
    });
    return {
      ht: parsed.reduce((s, l) => s + l.ht, 0),
      tva: parsed.reduce((s, l) => s + l.tvaValue, 0),
      ttc: parsed.reduce((s, l) => s + l.ttc, 0),
    };
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lignes = lines
      .filter((l) => l.designation.trim())
      .map((l) => ({
        designation: l.designation,
        quantite: Number(l.quantite) || 0,
        prixUnitaire: Number(l.prixUnitaire) || 0,
        tva: Number(l.tva) || 0,
        articleId: l.articleId || undefined,
      }));
  onSubmit({ fournisseurId, status, lignes, montantTotal: totals.ttc });
    onClose();
  };

  const handleProductSelect = (p: InventoryArticle) => {
    if (activeLine === null) return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === activeLine
          ? {
              ...l,
              designation: p.nom || p.reference || l.designation,
              prixUnitaire: (p.prixVente ?? p.prixAchat ?? 0).toString(),
              articleId: p.id,
            }
          : l
      )
    );
    setProductModal(false);
    setProductSearch("");
    setActiveLine(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Nouvelle commande</h3>
            <p className="text-sm text-muted-foreground">Créer une commande fournisseur.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fournisseur</label>
              <select
                value={fournisseurId}
                onChange={(e) => setFournisseurId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {suppliers.length === 0 && <option value="">Aucun fournisseur</option>}
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || (s as any).nom || s.email || "Sans nom"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Lignes de commande</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    { designation: "", quantite: "1", prixUnitaire: "0", tva: "0", articleId: "" },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2 w-20">Qté</th>
                    <th className="px-3 py-2 w-24">PU</th>
                    <th className="px-3 py-2 w-20">TVA %</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Input
                            value={line.designation}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, designation: e.target.value, articleId: "" } : l
                                )
                              )
                            }
                            placeholder="Article"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setActiveLine(idx);
                              setProductModal(true);
                            }}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={line.quantite}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, quantite: e.target.value } : l))
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.prixUnitaire}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, prixUnitaire: e.target.value } : l))
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.tva}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, tva: e.target.value } : l))
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Sous-total HT</span>
              <span>{totals.ht.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
            </div>
            <div className="flex justify-between">
              <span>TVA</span>
              <span>{totals.tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total TTC</span>
              <span>{totals.ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </div>

      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h4 className="text-lg font-semibold">Sélectionner un produit</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setProductModal(false);
                  setProductSearch("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border-b px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Nom</th>
                    <th className="px-4 py-2 font-medium">Catégorie</th>
                    <th className="px-4 py-2 font-medium">Stock</th>
                    <th className="px-4 py-2 font-medium">Prix vente</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Chargement...
                      </td>
                    </tr>
                  )}
                  {!loadingProducts && products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  )}
                  {products.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="px-4 py-3">{product.nom}</td>
                      <td className="px-4 py-3">{product.categorie || "—"}</td>
                      <td className="px-4 py-3">{product.quantiteStock ?? "—"}</td>
                      <td className="px-4 py-3">
                        {(product.prixVente ?? 0).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        F
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleProductSelect(product)}
                          disabled={activeLine === null}
                        >
                          Sélectionner
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
