'use client';

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
import type { PurchaseOrdersPageModel } from './PurchaseOrdersPage.model';

export function PurchaseOrderDialogs(props: PurchaseOrdersPageModel) {
  const { selectedOrder, showCreate, setShowCreate, editOrder, setEditOrder, showReceptionModal, setShowReceptionModal, showDecaissementDialog, setShowDecaissementDialog, showFactureFournisseurDialog, setShowFactureFournisseurDialog, receptionArticleSelections, setReceptionArticleSelections, receptionNotes, setReceptionNotes, setReceptionInvoiceFile, selectedDetail, suppliers, createMutation, updateMutation, createReceptionMutation, createDecaissementMutation, createFactureFournisseurMutation, canCreateCashVoucher, articles, receptionsByOrderId, canCreate, canUpdate, selectedOrderForAccounting } = props;
  return (
    <>
      {canCreate && (
              <CreateCommandeModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                suppliers={suppliers}
                onSubmit={(payload) => createMutation.mutate(payload)}
              />
            )}
      {canUpdate && (
              <EditCommandeModal
                isOpen={!!editOrder}
                onClose={() => setEditOrder(null)}
                defaultStatus={editOrder?.status}
                defaultAmount={editOrder?.amount}
                onSubmit={(data) => {
                  if (!editOrder) return;
                  updateMutation.mutate({
                    id: editOrder.id,
                    status: data.status,
                    amount: data.amount,
                    currentStatus: editOrder.status,
                  });
                }}
              />
            )}
      {canCreateCashVoucher && selectedOrderForAccounting ? (
              <>
                <CreateDecaissementDialog
                  open={showDecaissementDialog}
                  onOpenChange={setShowDecaissementDialog}
                  defaultCommitment={selectedOrderForAccounting.commitment}
                  onSubmit={(payload) => createDecaissementMutation.mutate(payload)}
                  isSubmitting={createDecaissementMutation.isPending}
                />
                <CreateFactureFournisseurDialog
                  open={showFactureFournisseurDialog}
                  onOpenChange={setShowFactureFournisseurDialog}
                  commitment={selectedOrderForAccounting.commitment}
                  onSubmit={(payload) => createFactureFournisseurMutation.mutate(payload)}
                  isSubmitting={createFactureFournisseurMutation.isPending}
                />
              </>
            ) : null}
      {canUpdate && (
            <Dialog open={showReceptionModal} onOpenChange={setShowReceptionModal}>
              <DialogContent className="grid max-h-[92vh] max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Créer une réception</DialogTitle>
                  <DialogDescription>
                    Vérifiez les quantités reçues avant d’enregistrer la réception.
                  </DialogDescription>
                </DialogHeader>
                {(() => {
                  const d: any = selectedDetail || selectedOrder;
                  if (!d) return <div>Aucune commande sélectionnée.</div>;
                  const existingReception = d?.id ? receptionsByOrderId.get(d.id) : undefined;
                  if (existingReception) {
                    return (
                      <div className="space-y-4">
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                          Le bon de commande <strong>{d.number || d.numeroBon}</strong> possède déjà la réception{" "}
                          <strong>{existingReception.numero}</strong>. Une seule réception est autorisée par bon de
                          commande.
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowReceptionModal(false);
                              setReceptionInvoiceFile(null);
                            }}
                          >
                            Fermer
                          </Button>
                        </DialogFooter>
                      </div>
                    );
                  }
                  const lines = d.itemsDetail || d.lignes || [];
                  const payload = {
                    bonCommandeId: d.id,
                    fournisseurId: d.fournisseurId ?? d.supplierId,
                    notes: receptionNotes.trim(),
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
                  const lignesSansArticle = payload.lignes.filter(
                    (l: { articleId: string | null }) => !l.articleId
                  );

                  return (
                    <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4">
                      <div className="text-sm text-muted-foreground">
                        Bon de commande : <strong>{d.number || d.numeroBon}</strong>
                      </div>
                      {lignesSansArticle.length > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Au moins {lignesSansArticle.length} ligne(s) n&rsquo;est associée à aucun article.
                          Sélectionnez des articles dans la commande avant de créer la réception.
                        </div>
                      )}
                      <ReceptionLinesGrid
                        lines={payload.lignes}
                        articles={articles}
                        selections={receptionArticleSelections}
                        onSelectArticle={(index, articleId) =>
                          setReceptionArticleSelections((prev) => ({
                            ...prev,
                            [index]: articleId,
                          }))
                        }
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observations de réception</label>
                        <Textarea
                          placeholder="Saisir les remarques à imprimer sur le bon de réception..."
                          value={receptionNotes}
                          onChange={(e) => setReceptionNotes(e.target.value)}
                          className="min-h-[96px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Facture fournisseur</label>
                        <Input
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setReceptionInvoiceFile(file);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Joignez la facture fournisseur pour l&apos;archivage de la réception.
                        </p>
                      </div>

                      <DialogFooter className="border-t bg-background pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReceptionModal(false);
                            setReceptionInvoiceFile(null);
                          }}
                        >
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
            )}
    </>
  );
}
