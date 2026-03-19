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
  categorie: string;
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

const EMPTY_LINE: OrderLineForm = {
  designation: "",
  categorie: "",
  quantite: "1",
  prixUnitaire: "0",
  tva: "0",
  articleId: "",
};

export function CreateCommandeModal({
  isOpen,
  onClose,
  suppliers,
  defaultStatus = "BROUILLON",
  onSubmit,
}: Props) {
  const [fournisseurId, setFournisseurId] = useState<string>("");
  const [status, setStatus] = useState<PurchaseOrderStatus>(defaultStatus);
  const [lines, setLines] = useState<OrderLineForm[]>([{ ...EMPTY_LINE }]);
  const [productSearch, setProductSearch] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [modalCategory, setModalCategory] = useState("");

  const { data: productsResponse, isFetching: loadingProducts } = useQuery({
    queryKey: ["inventory-articles-for-orders"],
    queryFn: () => inventoryService.getArticles(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const products: InventoryArticle[] = productsResponse?.data ?? [];

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.categorie).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [products]
  );

  const getProductsForCategory = (category?: string) =>
    products.filter((product) => !category || product.categorie === category);

  const filteredModalProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    const selectedCategory =
      modalCategory || (activeLine !== null ? lines[activeLine]?.categorie || "" : "");

    return getProductsForCategory(selectedCategory).filter((product) => {
      if (!normalizedSearch) return true;
      return [product.nom, product.reference, product.categorie]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [activeLine, lines, modalCategory, productSearch, products]);

  useEffect(() => {
    if (!isOpen) return;
    setFournisseurId(suppliers[0]?.id || "");
    setStatus(defaultStatus);
    setLines([{ ...EMPTY_LINE }]);
    setProductSearch("");
    setModalCategory("");
    setProductModal(false);
    setActiveLine(null);
  }, [isOpen, suppliers, defaultStatus]);

  const totals = useMemo(() => {
    const parsed = lines.map((line) => {
      const quantite = Number(line.quantite) || 0;
      const prixUnitaire = Number(line.prixUnitaire) || 0;
      const tva = Number(line.tva) || 0;
      const ht = quantite * prixUnitaire;
      const ttc = ht * (1 + tva / 100);
      return { ht, ttc, tvaValue: ttc - ht };
    });

    return {
      ht: parsed.reduce((sum, line) => sum + line.ht, 0),
      tva: parsed.reduce((sum, line) => sum + line.tvaValue, 0),
      ttc: parsed.reduce((sum, line) => sum + line.ttc, 0),
    };
  }, [lines]);

  const updateLine = (index: number, patch: Partial<OrderLineForm>) => {
    setLines((current) => current.map((line, currentIndex) => (currentIndex === index ? { ...line, ...patch } : line)));
  };

  const handleArticleSelect = (index: number, product: InventoryArticle) => {
    updateLine(index, {
      categorie: product.categorie || "",
      designation: product.nom || product.reference || "",
      prixUnitaire: String(product.prixVente ?? product.prixAchat ?? 0),
      articleId: product.id,
    });
  };

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
      }))
      .filter((line) => line.designation && line.quantite > 0);

    onSubmit({ fournisseurId, status, lignes, montantTotal: totals.ttc });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Nouvelle commande</h3>
            <p className="text-sm text-muted-foreground">Creer une commande fournisseur a partir du catalogue articles.</p>
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
            <div className="space-y-1">
              <label className="text-sm font-medium">Statut</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PurchaseOrderStatus)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="BROUILLON">Brouillon</option>
                <option value="ENVOYE">Envoyee</option>
                <option value="CONFIRME">Confirmee</option>
                <option value="LIVRE">Livree</option>
                <option value="ANNULE">Annulee</option>
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
                onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Categorie</th>
                    <th className="px-3 py-2">Designation</th>
                    <th className="px-3 py-2 w-20">Qte</th>
                    <th className="px-3 py-2 w-24">PU</th>
                    <th className="px-3 py-2 w-20">TVA %</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const productsForLine = getProductsForCategory(line.categorie);

                    return (
                      <tr key={`${index}-${line.articleId || "manual"}`} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            value={line.categorie}
                            onChange={(event) =>
                              updateLine(index, {
                                categorie: event.target.value,
                                articleId: "",
                                designation: "",
                                prixUnitaire: "0",
                              })
                            }
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Toutes les categories</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <select
                              value={line.articleId || ""}
                              onChange={(event) => {
                                const product = products.find((entry) => entry.id === event.target.value);
                                if (!product) {
                                  updateLine(index, { articleId: "", designation: "" });
                                  return;
                                }
                                handleArticleSelect(index, product);
                              }}
                              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Selectionner un article</option>
                              {productsForLine.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.reference ? `${product.reference} - ` : ""}
                                  {product.nom}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setActiveLine(index);
                                setModalCategory(line.categorie || "");
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
                            onChange={(event) => updateLine(index, { quantite: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={line.prixUnitaire}
                            onChange={(event) => updateLine(index, { prixUnitaire: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={line.tva}
                            onChange={(event) => updateLine(index, { tva: event.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setLines((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                            disabled={lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
            <Button type="submit" disabled={!fournisseurId || lines.every((line) => !line.designation.trim())}>
              Enregistrer
            </Button>
          </div>
        </form>
      </div>

      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h4 className="text-lg font-semibold">Selectionner un produit</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setProductModal(false);
                  setProductSearch("");
                  setModalCategory("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-3 border-b px-6 py-3 md:grid-cols-[220px_1fr]">
              <select
                value={modalCategory}
                onChange={(event) => setModalCategory(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Toutes les categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Reference</th>
                    <th className="px-4 py-2 font-medium">Nom</th>
                    <th className="px-4 py-2 font-medium">Categorie</th>
                    <th className="px-4 py-2 font-medium">Stock</th>
                    <th className="px-4 py-2 font-medium">Prix vente</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        Chargement des produits...
                      </td>
                    </tr>
                  ) : filteredModalProducts.length > 0 ? (
                    filteredModalProducts.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="px-4 py-3">{product.reference || "-"}</td>
                        <td className="px-4 py-3 font-medium">{product.nom}</td>
                        <td className="px-4 py-3">{product.categorie || "-"}</td>
                        <td className="px-4 py-3">{product.quantiteStock ?? 0}</td>
                        <td className="px-4 py-3">
                          {(product.prixVente ?? product.prixAchat ?? 0).toLocaleString("fr-FR", {
                            minimumFractionDigits: 0,
                          })}{" "}
                          F
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (activeLine !== null) {
                                handleArticleSelect(activeLine, product);
                              }
                              setProductModal(false);
                              setProductSearch("");
                              setModalCategory("");
                              setActiveLine(null);
                            }}
                          >
                            Selectionner
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        Aucun produit trouve.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
