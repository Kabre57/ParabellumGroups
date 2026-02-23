"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, Printer, Search, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { procurementService } from "@/services/procurement";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/services/procurement";
import { CreateCommandeModal } from "@/components/achat/CreateCommandeModal";
import type { CreateCommandePayload } from "@/components/achat/CreateCommandeModal";
import { EditCommandeModal } from "@/components/achat/EditCommandeModal";
import { ViewCommandeModal } from "@/components/achat/ViewCommandeModal";
import { inventoryReceptionsService } from "@/shared/api/inventory/receptions.service";
import { inventoryService } from "@/shared/api/inventory/inventory.service";
import type { Reception } from "@/shared/api/inventory/types";

const statusColors: Record<PurchaseOrderStatus, string> = {
  BROUILLON: "bg-yellow-100 text-yellow-800",
  ENVOYE: "bg-blue-100 text-blue-800",
  CONFIRME: "bg-purple-100 text-purple-800",
  LIVRE: "bg-green-100 text-green-800",
  ANNULE: "bg-red-100 text-red-800",
};

const statusLabels: Record<PurchaseOrderStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyée",
  CONFIRME: "Confirmée",
  LIVRE: "Livrée",
  ANNULE: "Annulée",
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [receptionArticleSelections, setReceptionArticleSelections] = useState<Record<number, string>>({});

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter, searchTerm],
    queryFn: () =>
      procurementService.getOrders({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchTerm || undefined,
        limit: 200,
      }),
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => procurementService.getSuppliers({ limit: 200 }),
  });

  const { data: selectedDetail, isFetching: isDetailLoading } = useQuery({
    queryKey: ["purchase-order-detail", selectedOrderId],
    queryFn: () =>
      procurementService.getOrder(selectedOrderId || "").then((res) => res.data),
    enabled: !!selectedOrderId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const rawOrders = ordersResponse?.data ?? [];
  const orders: PurchaseOrder[] = useMemo(
    () =>
      rawOrders.map((o: any) => ({
        ...o,
        number: o.number || o.numeroBon || "",
        supplierId: o.supplierId || o.fournisseurId,
        supplier: o.supplier || o.fournisseurNom,
        amount: Number(o.amount ?? o.montantTotal ?? 0),
        items: o.items ?? (o.lignes ? o.lignes.length : o.itemsDetail?.length ?? 0),
        date: o.date || o.dateCommande || o.createdAt || "",
      })),
    [rawOrders]
  );
  const suppliers: Supplier[] = suppliersResponse?.data ?? [];
  const suppliersMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => map.set(s.id, s.name || (s as any).nom || s.email || "Sans nom"));
    return map;
  }, [suppliers]);
  const resolveSupplierName = (supplierId?: string, fallback?: string) =>
    (supplierId && suppliersMap.get(supplierId)) || fallback || "Sans nom";

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "BROUILLON" || o.status === "ENVOYE").length,
      confirmed: orders.filter((o) => o.status === "CONFIRME").length,
      totalAmount: orders.reduce((sum, o) => sum + (o.amount ?? 0), 0),
    };
  }, [orders]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateCommandePayload) =>
      procurementService.createOrder({
        fournisseurId: payload.fournisseurId,
        montantTotal: payload.montantTotal,
        lignes: payload.lignes,
        status: payload.status,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, amount }: { id: string; status: PurchaseOrderStatus; amount?: number }) =>
      procurementService.updateOrder(id, { status, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-detail", selectedOrderId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => procurementService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const createReceptionMutation = useMutation({
    mutationFn: (payload: Parameters<typeof inventoryReceptionsService.create>[0]) =>
      inventoryReceptionsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      setShowReceptionModal(false);
      router.push("/dashboard/achats/receptions");
    },
  });

  const filteredOrders = useMemo(() => {
    const search = (searchTerm || "").toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      const supplierName = resolveSupplierName(order.supplierId, order.supplier).toLowerCase();
      const orderNumber = (order.number || "").toLowerCase();
      const matchesSearch = orderNumber.includes(search) || supplierName.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const { data: articlesResponse } = useQuery({
    queryKey: ["inventory-articles-all"],
    queryFn: () => inventoryService.getArticles({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const articles = articlesResponse?.data ?? [];

  useEffect(() => {
    // reset selections when closing modal or changing order
    if (!showReceptionModal) {
      setReceptionArticleSelections({});
    }
  }, [showReceptionModal]);

  const handleDelete = (order: PurchaseOrder) => {
    if (confirm(`Supprimer la commande ${order.number} ?`)) {
      deleteMutation.mutate(order.id);
      if (selectedOrderId === order.id) {
        setSelectedOrderId(null);
        setSelectedOrder(null);
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Commandes achat</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle commande
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalAmount ?? 0).toLocaleString("fr-FR")} F
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Liste des commandes</CardTitle>
            <CardDescription>Suivi des commandes fournisseurs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par numéro ou fournisseur..."
                    className="pl-9"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "ALL")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="BROUILLON">Brouillon</option>
                <option value="ENVOYE">Envoyée</option>
                <option value="CONFIRME">Confirmée</option>
                <option value="LIVRE">Livrée</option>
                <option value="ANNULE">Annulée</option>
              </select>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Numéro</th>
                      <th className="px-4 py-3 font-medium">Fournisseur</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Articles</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Montant</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-slate-50 ${
                          selectedOrderId === order.id ? "bg-slate-100" : ""
                        }`}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setSelectedOrder(order);
                        }}
                      >
                        <td className="px-4 py-3 font-medium">{order.number || "Sans nom"}</td>
                        <td className="px-4 py-3">{resolveSupplierName(order.supplierId, order.supplier)}</td>
                        <td className="px-4 py-3">
                          {order.date ? new Date(order.date).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-3">{order.items}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {(order.amount ?? 0).toLocaleString("fr-FR")} F
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setViewOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditOrder(order)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order)}
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setViewOrder(order)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">Aucune commande trouvée.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Détails de la commande</CardTitle>
            <CardDescription>Sélectionnez une commande dans la liste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetailLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Spinner />
              </div>
            ) : !(selectedDetail || selectedOrder) ? (
              <div className="py-8 text-center text-muted-foreground">Aucune commande sélectionnée.</div>
            ) : (
              (() => {
                const d: any = selectedDetail || selectedOrder;
                const lines = d.itemsDetail || d.lignes || [];
                const amount = Number(d.amount ?? d.montantTotal ?? 0);
                const date = d.date || d.dateCommande || d.createdAt || "";

                const sousTotalHT = lines.reduce((sum: number, item: any) => {
                  const ht =
                    item.montantHT ??
                    (item.unitPrice ?? item.prixUnitaire ?? 0) * (item.quantity ?? item.quantite ?? 0);
                  return sum + ht;
                }, 0);
                const totalTVA = lines.reduce((sum: number, item: any) => {
                  const ht =
                    item.montantHT ??
                    (item.unitPrice ?? item.prixUnitaire ?? 0) * (item.quantity ?? item.quantite ?? 0);
                  const ttc = item.montantTTC ?? item.amount ?? ht;
                  return sum + (ttc - ht);
                }, 0);

                return (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Fournisseur</div>
                        <div className="font-semibold">
                          {resolveSupplierName(d.supplierId ?? d.fournisseurId, d.supplier ?? d.fournisseurNom)}
                        </div>
                        {d.supplierEmail && (
                          <div className="text-xs text-muted-foreground">{d.supplierEmail}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground">Statut</div>
                        <Badge className={statusColors[d.status as PurchaseOrderStatus] ?? "bg-slate-100"}>
                          {statusLabels[d.status as PurchaseOrderStatus] ?? d.status ?? "—"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Date</div>
                        <div className="font-semibold">
                          {date ? new Date(date).toLocaleDateString("fr-FR") : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Montant total</div>
                        <div className="font-semibold">
                          {amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F
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

                    <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span>Sous-total HT</span>
                        <span>{sousTotalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA</span>
                        <span>{totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total TTC</span>
                        <span>{amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} F</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setViewOrder(d)}>Voir / Imprimer</Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowReceptionModal(true)}
                        disabled={!d?.id || lines.length === 0}
                      >
                        Créer une réception
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCommandeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        suppliers={suppliers}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <EditCommandeModal
        isOpen={!!editOrder}
        onClose={() => setEditOrder(null)}
        defaultStatus={editOrder?.status}
        defaultAmount={editOrder?.amount}
        onSubmit={(data) => {
          if (!editOrder) return;
          updateMutation.mutate({ id: editOrder.id, status: data.status, amount: data.amount });
        }}
      />

      <ViewCommandeModal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder || selectedDetail || selectedOrder || undefined}
      />

      <Dialog open={showReceptionModal} onOpenChange={setShowReceptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une réception</DialogTitle>
            <DialogDescription>
              Vérifiez les quantités reçues avant d’enregistrer la réception.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const d: any = selectedDetail || selectedOrder;
            if (!d) return <div>Aucune commande sélectionnée.</div>;
            const lines = d.itemsDetail || d.lignes || [];
            const payload = {
              bonCommandeId: d.id,
              fournisseurId: d.fournisseurId ?? d.supplierId,
              notes: "",
              lignes: lines.map((item: any, idx: number) => ({
                articleId: (() => {
                  const selected = receptionArticleSelections[idx];
                  if (selected) return selected;
                  const auto =
                    item.articleId ??
                    item.article_id ??
                    item.article?.id ??
                    item.article?.articleId ??
                    null;
                  if (auto) return auto;
                  const byName = articles.find(
                    (a) =>
                      a.nom?.toLowerCase() === (item.designation || "").toLowerCase() ||
                      a.reference?.toLowerCase() === (item.designation || "").toLowerCase()
                  );
                  return byName?.id ?? null;
                })(),
                designation: item.designation,
                quantitePrev: item.quantity ?? item.quantite ?? 0,
                quantiteRecue: item.quantity ?? item.quantite ?? 0,
                prixUnitaire: item.unitPrice ?? item.prixUnitaire ?? 0,
                tva: item.tva ?? 0,
              })),
            };
            const lignesSansArticle = payload.lignes.filter((l) => !l.articleId);

            return (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Bon de commande : <strong>{d.number || d.numeroBon}</strong>
                </div>
                {lignesSansArticle.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Au moins {lignesSansArticle.length} ligne(s) n&rsquo;est associée à aucun article.
                    Sélectionnez des articles dans la commande avant de créer la réception.
                  </div>
                )}
                <div className="max-h-64 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Désignation</th>
                        <th className="px-4 py-2">Qté reçue</th>
                        <th className="px-4 py-2">PU</th>
                        <th className="px-4 py-2">TVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payload.lignes.map((l: (typeof payload.lignes)[number], idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">
                            <div className="font-medium">{l.designation}</div>
                            <div className="mt-2">
                              <select
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={receptionArticleSelections[idx] ?? l.articleId ?? ""}
                                onChange={(e) =>
                                  setReceptionArticleSelections((prev) => ({
                                    ...prev,
                                    [idx]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Associer à un article…</option>
                                {articles.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.nom || a.reference} {a.reference ? `(${a.reference})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-2">{l.quantiteRecue}</td>
                          <td className="px-4 py-2">{l.prixUnitaire}</td>
                          <td className="px-4 py-2">{l.tva ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowReceptionModal(false)}>
                    Annuler
                  </Button>
                  <Button
                    disabled={createReceptionMutation.isPending || lignesSansArticle.length > 0}
                    onClick={() => createReceptionMutation.mutate(payload as any)}
                  >
                    {createReceptionMutation.isPending ? "Enregistrement..." : "Enregistrer la réception"}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
