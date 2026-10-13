"use client";
import { usePurchaseOrdersPageModel } from "./PurchaseOrdersPage.model";
import { PurchaseOrderDialogs } from "./PurchaseOrderDialogs";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, Printer, Search, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import billingService, { type Decaissement, type PurchaseCommitment } from "@/shared/api/billing";
import { CreateDecaissementDialog } from "@/components/accounting/CreateDecaissementDialog";
import { CreateFactureFournisseurDialog } from "@/components/accounting/CreateFactureFournisseurDialog";
import { inventoryReceptionsService } from "@/shared/api/inventory/receptions.service";
import { inventoryService } from "@/shared/api/inventory/inventory.service";
import type { Reception } from "@/shared/api/inventory/types";
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { DocumentLinesTable } from '@/components/procurement/DocumentLinesTable';
import { ReceptionLinesGrid } from '@/components/procurement/ReceptionLinesGrid';

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

  const pageModel = usePurchaseOrdersPageModel();
  const { user, queryClient, router, searchParams, statusFilter, setStatusFilter, searchTerm, setSearchTerm, selectedOrderId, setSelectedOrderId, selectedOrder, setSelectedOrder, showCreate, setShowCreate, editOrder, setEditOrder, viewOrder, setViewOrder, showReceptionModal, setShowReceptionModal, showDecaissementDialog, setShowDecaissementDialog, showFactureFournisseurDialog, setShowFactureFournisseurDialog, receptionArticleSelections, setReceptionArticleSelections, receptionNotes, setReceptionNotes, receptionInvoiceFile, setReceptionInvoiceFile, permissionSet, ordersResponse, isLoading, suppliersResponse, selectedDetail, isDetailLoading, rawOrders, orders, suppliers, suppliersMap, resolveSupplierName, stats, createMutation, updateMutation, deleteMutation, createReceptionMutation, createDecaissementMutation, createFactureFournisseurMutation, filteredOrders, articlesResponse, receptionsResponse, canReadCashVouchers, canCreateCashVoucher, cashVouchersResponse, articles, receptions, cashVouchers, receptionsByOrderId, cashVoucherByOrderId, canCreate, canUpdate, canDelete, canExport, handleDelete, selectedOrderForAccounting } = pageModel;

return (
    <div className="space-y-6 overflow-x-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Commandes achat</h1>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle commande
          </Button>
        )}
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
        <Card className="h-full min-w-0">
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
                          router.replace(`/dashboard/achats/commandes?selectedOrderId=${order.id}`, {
                            scroll: false,
                          });
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
                            {canUpdate && (
                              <Button variant="ghost" size="icon" onClick={() => setEditOrder(order)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(order)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            {canExport && (
                              <Button variant="ghost" size="icon" onClick={() => setViewOrder(order)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
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

        <Card className="h-full min-w-0">
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
                const existingReception = d?.id ? receptionsByOrderId.get(d.id) : undefined;
                const existingCashVoucher = d?.id ? cashVoucherByOrderId.get(d.id) : undefined;

                return (
                  <div className="min-w-0 space-y-4">
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

                    <DocumentLinesTable
                      title="Lignes de la commande"
                      description="Lecture dense type ERP pour garder les colonnes visibles même sur les grosses commandes."
                      lines={lines.map((item: any) => ({
                        id: item.id,
                        imageUrl:
                          item.imageUrl ||
                          (item.articleId ? articles.find((article) => article.id === item.articleId)?.imageUrl || null : null),
                        designation: item.designation,
                        categorie: item.categorie,
                        quantite: item.quantity ?? item.quantite ?? 0,
                        prixUnitaire: item.unitPrice ?? item.prixUnitaire ?? 0,
                        tva: item.tva ?? 0,
                        montantHT:
                          item.montantHT ??
                          (item.unitPrice ?? item.prixUnitaire ?? 0) * (item.quantity ?? item.quantite ?? 0),
                        montantTTC: item.amount ?? item.montantTTC ?? 0,
                      }))}
                      heightClass="h-[320px]"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setViewOrder(d)}>Voir</Button>
                      {existingCashVoucher ? (
                        <div className="flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          Bon de décaissement : {existingCashVoucher.numeroPiece}
                        </div>
                      ) : null}
                      {canCreateCashVoucher && ['CONFIRME', 'LIVRE'].includes(String(d.status || '')) ? (
                        <>
                          <Button
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            onClick={() => setShowFactureFournisseurDialog(true)}
                          >
                            Liquider (Saisir Facture)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDecaissementDialog(true)}
                            disabled={Boolean(existingCashVoucher)}
                          >
                            {existingCashVoucher ? 'Déjà payé' : 'Payer (Décaissement)'}
                          </Button>
                        </>
                      ) : null}
                      {existingCashVoucher ? (
                        <Button variant="secondary" onClick={() => router.push('/dashboard/comptabilite/depenses')}>
                          Voir le décaissement
                        </Button>
                      ) : null}
                      {existingReception && (
                        <div className="flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                          Réception déjà créée : {existingReception.numero}
                        </div>
                      )}
                      {canUpdate && (
                        <Button
                          variant="secondary"
                          onClick={() => setShowReceptionModal(true)}
                          disabled={!d?.id || lines.length === 0 || Boolean(existingReception)}
                        >
                          {existingReception ? "Réception déjà créée" : "Créer une réception"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
      <PurchaseOrderDialogs {...pageModel} />

      <ViewCommandeModal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder || selectedDetail || selectedOrder || undefined}
      />

    </div>
  );
}
