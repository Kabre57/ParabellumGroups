'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { procurementService } from '@/services/procurement';
import { enterpriseApi } from '@/lib/api';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { PurchaseRequest, PurchaseRequestStatus } from '@/services/procurement';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { CreateDpaDialog } from '@/components/achat/dpa/CreateDpaDialog';
import { ArticlePickerDialog } from '@/components/inventory/ArticlePickerDialog';
import { QuickCreateArticleDialog } from '@/components/inventory/QuickCreateArticleDialog';
import {
  createEmptyDpaDraftLine,
  type DpaDraftLine,
} from '@/components/achat/dpa';
import { statusLabels, statusColors, parseEnterpriseId, usePurchaseQuotesPageModel } from './page.model';

export default function PurchaseQuotesPage() {  const { user, queryClient, statusFilter, setStatusFilter, search, setSearch, open, setOpen, title, setTitle, description, setDescription, notes, setNotes, enterpriseId, setEnterpriseId, supplierId, setSupplierId, manualSupplierName, setManualSupplierName, dateBesoin, setDateBesoin, lines, setLines, articlePickerLineIndex, setArticlePickerLineIndex, articleCreateLineIndex, setArticleCreateLineIndex, rejectTarget, setRejectTarget, permissionSet, hasDirectPermission, canManageAllQuotes, canReadOwnQuotesOnly, canCreate, canApprove, canReject, canCreateOrder, canSubmit, requestsResponse, isLoading, suppliersResponse, enterprisesResponse, articlesResponse, requests, suppliers, articles, accessibleEnterprises, draftTotals, stats, createMutation, submitMutation, approveMutation, rejectMutation, updateLineArticle, updateLine, applyArticleToLine, supplierName } = usePurchaseQuotesPageModel();



  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Devis internes</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos devis internes et leurs informations.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total devis internes</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">En attente</div><div className="text-2xl font-bold text-blue-600">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Convertis en BC</div><div className="text-2xl font-bold text-green-600">{stats.converted}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant total</div><div className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} F</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des devis internes</CardTitle>
          <CardDescription>Rechercher, consulter et suivre.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par numéro, objet ou fournisseur..."
              className="max-w-xl"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PurchaseRequestStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="SOUMISE">Soumise</option>
              <option value="APPROUVEE">Validée PDG</option>
              <option value="REJETEE">Rejetée</option>
              <option value="PROFORMAS_EN_COURS">Proformas en préparation</option>
              <option value="PROFORMA_SOUMISE">Proforma soumise PDG</option>
              <option value="PROFORMA_APPROUVEE">Proforma validée</option>
              <option value="COMMANDEE">Convertie en BC</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Spinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Numéro</th>
                    <th className="px-4 py-3 font-medium">Objet</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{request.number}</td>
                      <td className="px-4 py-3">{request.objet || request.title}</td>
                      <td className="px-4 py-3">{supplierName(request.supplierId) || request.supplierName || request.manualSupplierName || '-'}</td>
                      <td className="px-4 py-3 font-medium">
                        {(request.montantTTC || request.estimatedAmount || 0) > 0
                          ? `${(request.montantTTC || request.estimatedAmount || 0).toLocaleString('fr-FR')} F`
                          : 'À définir par achat'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/achats/devis/${request.id}`}>Voir</Link>
                          </Button>
                          {canSubmit && (request.status === 'BROUILLON' || request.status === 'REJETEE') && (
                            <Button size="sm" variant="outline" onClick={() => submitMutation.mutate(request.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Soumettre à validation
                            </Button>
                          )}
                          {request.status === 'SOUMISE' && (canApprove || canReject) && (
                            <>
                              {canApprove && (
                                <Button size="sm" onClick={() => approveMutation.mutate(request.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approuver
                                </Button>
                              )}
                              {canReject && (
                                <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rejeter
                                </Button>
                              )}
                            </>
                          )}
                          {request.bonCommandeId && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/achats/commandes?selectedOrderId=${request.bonCommandeId}`}>Voir BC</Link>
                            </Button>
                          )}
                          {!request.bonCommandeId &&
                            ['APPROUVEE', 'PROFORMAS_EN_COURS', 'PROFORMA_SOUMISE', 'PROFORMA_APPROUVEE'].includes(request.status) &&
                            canCreateOrder && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/achats/devis/${request.id}`}>
                                {request.status === 'PROFORMA_APPROUVEE' ? 'Générer BC' : 'Gérer proformas'}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  Aucun devis interne trouvé.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateDpaDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        onTitleChange={setTitle}
        enterpriseId={enterpriseId}
        enterprises={accessibleEnterprises}
        onEnterpriseChange={setEnterpriseId}
        dateBesoin={dateBesoin}
        onDateBesoinChange={setDateBesoin}
        supplierId={supplierId}
        suppliers={suppliers}
        onSupplierChange={(value) => {
          setSupplierId(value);
          if (value) {
            setManualSupplierName('');
          }
        }}
        manualSupplierName={manualSupplierName}
        onManualSupplierNameChange={(value) => {
          setManualSupplierName(value);
          if (value.trim()) {
            setSupplierId('');
          }
        }}
        notes={notes}
        onNotesChange={setNotes}
        description={description}
        onDescriptionChange={setDescription}
        lines={lines}
        articles={articles}
        onAddLine={() => setLines((current) => [...current, createEmptyDpaDraftLine()])}
        onDuplicateLine={(index) =>
          setLines((current) => {
            const source = current[index];
            return [...current.slice(0, index + 1), { ...source, id: undefined }, ...current.slice(index + 1)];
          })
        }
        onRemoveLine={(index) => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
        onUpdateLine={updateLine}
        onSelectArticle={updateLineArticle}
        onOpenArticlePicker={setArticlePickerLineIndex}
        onOpenCreateArticle={setArticleCreateLineIndex}
        totalTTC={draftTotals.montantTTC}
        isPending={createMutation.isPending}
        canSubmit={Boolean(title && enterpriseId && (supplierId || manualSupplierName.trim()))}
        onSubmit={() => createMutation.mutate()}
      />


      <ArticlePickerDialog
        open={articlePickerLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticlePickerLineIndex(null);
        }}
        articles={articles}
        onSelect={(article) => {
          if (articlePickerLineIndex === null) return;
          applyArticleToLine(articlePickerLineIndex, article);
          setArticlePickerLineIndex(null);
        }}
        title="Choisir dans la liste complete"
        description="Sélectionnez un produit du catalogue pour remplir rapidement la ligne du devis interne."
      />

      <QuickCreateArticleDialog
        open={articleCreateLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticleCreateLineIndex(null);
        }}
        onCreated={(article) => {
          if (articleCreateLineIndex === null) return;
          applyArticleToLine(articleCreateLineIndex, article);
          setArticleCreateLineIndex(null);
        }}
      />

      <RejectPurchaseRequestDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        requestNumber={rejectTarget?.number}
        defaultReason="Hors budget"
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          rejectMutation.mutate(
            { id: rejectTarget.id, reason },
            {
              onSuccess: () => {
                setRejectTarget(null);
              },
            }
          );
        }}
      />
    </div>
  );
}
