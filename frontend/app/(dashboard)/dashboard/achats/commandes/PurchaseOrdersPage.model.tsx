"use client";

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


export function usePurchaseOrdersPageModel() {
const { user } = useAuth();

const queryClient = useQueryClient();

const router = useRouter();

const searchParams = useSearchParams();

const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "ALL">("ALL");

const [searchTerm, setSearchTerm] = useState("");

const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

const [showCreate, setShowCreate] = useState(false);

const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);

const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

const [showReceptionModal, setShowReceptionModal] = useState(false);

const [showDecaissementDialog, setShowDecaissementDialog] = useState(false);

const [showFactureFournisseurDialog, setShowFactureFournisseurDialog] = useState(false);

const [receptionArticleSelections, setReceptionArticleSelections] = useState<Record<number, string>>({});

const [receptionNotes, setReceptionNotes] = useState("");

const [receptionInvoiceFile, setReceptionInvoiceFile] = useState<File | null>(null);

const permissionSet = useMemo(() => buildPermissionSet(user), [user]);

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
    mutationFn: async ({
      id,
      status,
      amount,
      currentStatus,
    }: {
      id: string;
      status: PurchaseOrderStatus;
      amount?: number;
      currentStatus?: PurchaseOrderStatus;
    }) => {
      if (status !== currentStatus) {
        await procurementService.updateOrderStatus(id, status);
      }

      if (amount !== undefined) {
        return procurementService.updateOrder(id, { amount });
      }

      return procurementService.getOrder(id);
    },
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
    mutationFn: async (payload: Parameters<typeof inventoryReceptionsService.create>[0]) => {
      const created = await inventoryReceptionsService.create(payload);
      if (receptionInvoiceFile && created?.data?.id) {
        await inventoryReceptionsService.uploadSupplierInvoice(created.data.id, receptionInvoiceFile);
      }
      return created;
    },
    onSuccess: () => {
      toast.success("La réception a été créée avec succès.");
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      queryClient.invalidateQueries({ queryKey: ["receptions-for-orders"] });
      setShowReceptionModal(false);
      setReceptionNotes("");
      setReceptionInvoiceFile(null);
      router.push("/dashboard/achats/receptions");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Impossible de créer la réception."
      );
    },
  });

const createDecaissementMutation = useMutation({
    mutationFn: billingService.createDecaissement,
    onSuccess: () => {
      toast.success("Bon de décaissement créé avec succès.");
      setShowDecaissementDialog(false);
      queryClient.invalidateQueries({ queryKey: ["purchase-order-cash-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["billing-spending-overview"] });
      router.push("/dashboard/comptabilite/depenses");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Impossible de créer le bon de caisse lié à cette commande."
      );
    },
  });

const createFactureFournisseurMutation = useMutation({
    mutationFn: billingService.createFactureFournisseur,
    onSuccess: () => {
      toast.success("Facture fournisseur enregistrée (Liquidation effectuée).");
      setShowFactureFournisseurDialog(false);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-detail", selectedOrderId] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Impossible d'enregistrer la facture fournisseur."
      );
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
    queryFn: () => inventoryService.getArticles(),
    staleTime: 5 * 60 * 1000,
  });

const { data: receptionsResponse } = useQuery({
    queryKey: ["receptions-for-orders"],
    queryFn: () => inventoryReceptionsService.list({ limit: 200 }),
    staleTime: 60 * 1000,
  });

const canReadCashVouchers =
    isAdminRole(user) ||
    ['expenses.read', 'expenses.read_all', 'expenses.read_own', 'payments.read', 'payments.read_all'].some(
      (permission) => permissionSet.has(permission)
    );

const canCreateCashVoucher =
    isAdminRole(user) || permissionSet.has('expenses.create');

const { data: cashVouchersResponse } = useQuery({
    queryKey: ["purchase-order-cash-vouchers"],
    queryFn: () => billingService.getDecaissements({ sourceType: "PURCHASE_ORDER" }),
    enabled: canReadCashVouchers,
    staleTime: 60 * 1000,
  });

const articles = articlesResponse?.data ?? [];

const receptions: Reception[] =
    (Array.isArray(receptionsResponse) ? receptionsResponse : receptionsResponse?.data) ?? [];

const cashVouchers: Decaissement[] = (cashVouchersResponse?.data as any) ?? [];

const receptionsByOrderId = useMemo(() => {
    const map = new Map<string, Reception>();
    receptions.forEach((reception) => {
      if (reception?.bonCommandeId && !map.has(reception.bonCommandeId)) {
        map.set(reception.bonCommandeId, reception);
      }
    });
    return map;
  }, [receptions]);

const cashVoucherByOrderId = useMemo(() => {
    const map = new Map<string, Decaissement>();
    cashVouchers.forEach((voucher) => {
      if (voucher?.commitmentId && !map.has(voucher.commitmentId)) {
        map.set(voucher.commitmentId, voucher as any);
      }
    });
    return map;
  }, [cashVouchers]);

const { canCreate, canUpdate, canDelete, canExport } = getCrudVisibility(user, {
    read: ['purchase_orders.read'],
    create: ['purchase_orders.create'],
    update: ['purchase_orders.update', 'purchase_orders.approve', 'purchase_orders.receive', 'purchase_orders.send'],
    remove: ['purchase_orders.delete', 'purchase_orders.cancel'],
    export: ['purchase_orders.send'],
  });

useEffect(() => {
    // reset selections when closing modal or changing order
    if (!showReceptionModal) {
      setReceptionArticleSelections({});
      setReceptionNotes("");
    }
  }, [showReceptionModal]);

useEffect(() => {
    const selectedOrderIdFromUrl = searchParams.get("selectedOrderId");
    if (!selectedOrderIdFromUrl) {
      return;
    }

    setSelectedOrderId((current) =>
      current === selectedOrderIdFromUrl ? current : selectedOrderIdFromUrl
    );

    const matchingOrder = orders.find((order) => order.id === selectedOrderIdFromUrl);
    if (matchingOrder) {
      setSelectedOrder(matchingOrder);
    }
  }, [orders, searchParams]);

const handleDelete = (order: PurchaseOrder) => {
    if (confirm(`Supprimer la commande ${order.number} ?`)) {
      deleteMutation.mutate(order.id);
      if (selectedOrderId === order.id) {
        setSelectedOrderId(null);
        setSelectedOrder(null);
        router.replace("/dashboard/achats/commandes", { scroll: false });
      }
    }
  };

const selectedOrderForAccounting = useMemo(() => {
    const order: any = selectedDetail || selectedOrder;
    if (!order?.id) {
      return null;
    }

    const supplierId = order.fournisseurId ?? order.supplierId ?? null;
    const supplierName =
      resolveSupplierName(supplierId || undefined, order.fournisseurNom ?? order.supplier) || null;
    const amountHT = Number(order.montantHT ?? order.amountHT ?? order.amount ?? order.montantTotal ?? 0);
    const amountTVA = Number(order.montantTVA ?? order.amountTVA ?? 0);
    const amountTTC = Number(order.montantTotal ?? order.amount ?? amountHT + amountTVA);

    return {
      voucher: cashVoucherByOrderId.get(`purchase-order-${order.id}`) || null,
      commitment: {
        id: `purchase-order-${order.id}`,
        sourceType: "PURCHASE_ORDER" as const,
        sourceId: order.id,
        sourceNumber: order.numeroBon ?? order.number ?? "BC",
        enterpriseId: order.enterpriseId != null ? Number(order.enterpriseId) : null,
        enterpriseName: order.enterpriseName || null,
        serviceId: null,
        serviceName: null,
        supplierId,
        supplierName,
        amountHT,
        amountTVA,
        amountTTC,
        currency: order.devise || "XOF",
        status: order.status || "BROUILLON",
        createdAt: order.dateCommande || order.date || order.createdAt || null,
      } satisfies PurchaseCommitment,
    };
  }, [cashVoucherByOrderId, resolveSupplierName, selectedDetail, selectedOrder]);

  return {
    user,
    queryClient,
    router,
    searchParams,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    setSelectedOrder,
    showCreate,
    setShowCreate,
    editOrder,
    setEditOrder,
    viewOrder,
    setViewOrder,
    showReceptionModal,
    setShowReceptionModal,
    showDecaissementDialog,
    setShowDecaissementDialog,
    showFactureFournisseurDialog,
    setShowFactureFournisseurDialog,
    receptionArticleSelections,
    setReceptionArticleSelections,
    receptionNotes,
    setReceptionNotes,
    receptionInvoiceFile,
    setReceptionInvoiceFile,
    permissionSet,
    ordersResponse,
    isLoading,
    suppliersResponse,
    selectedDetail,
    isDetailLoading,
    rawOrders,
    orders,
    suppliers,
    suppliersMap,
    resolveSupplierName,
    stats,
    createMutation,
    updateMutation,
    deleteMutation,
    createReceptionMutation,
    createDecaissementMutation,
    createFactureFournisseurMutation,
    filteredOrders,
    articlesResponse,
    receptionsResponse,
    canReadCashVouchers,
    canCreateCashVoucher,
    cashVouchersResponse,
    articles,
    receptions,
    cashVouchers,
    receptionsByOrderId,
    cashVoucherByOrderId,
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    handleDelete,
    selectedOrderForAccounting,
  };
}

export type PurchaseOrdersPageModel = ReturnType<typeof usePurchaseOrdersPageModel>;
