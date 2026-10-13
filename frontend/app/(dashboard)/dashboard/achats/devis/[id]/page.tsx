'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, FileText, PackagePlus, Printer, Save, Send, Trash2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PurchaseRequestPrint from '@/components/printComponents/PurchaseRequestPrint';
import PurchaseCommissionPrint from '@/components/printComponents/PurchaseCommissionPrint';
import { RejectPurchaseRequestDialog } from '@/components/procurement/RejectPurchaseRequestDialog';
import { EditDpaCard } from '@/components/achat/dpa/EditDpaCard';
import { createEmptyDpaDraftLine } from '@/components/achat/dpa';
import { CreateProformaDialog, ProformaDecisionBoard, ProformaSuppliersSection } from '@/components/achat/proforma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, getStatusVariant, statusLabels } from './purchase-quote-detail.utils';
import { usePurchaseQuoteDetailPage } from './use-purchase-quote-detail';

export default function PurchaseQuoteDetailPage() {
  const {
    id,
    title,
    setTitle,
    description,
    setDescription,
    notes,
    setNotes,
    enterpriseId,
    setEnterpriseId,
    supplierId,
    setSupplierId,
    manualSupplierName,
    setManualSupplierName,
    dateBesoin,
    setDateBesoin,
    lines,
    setLines,
    isDirty,
    setIsDirty,
    rejectDialogOpen,
    setRejectDialogOpen,
    createProformaOpen,
    setCreateProformaOpen,
    rejectProformaTarget,
    setRejectProformaTarget,
    isPrintOpen,
    setIsPrintOpen,
    isCommissionPrintOpen,
    setIsCommissionPrintOpen,
    canApprove,
    canReject,
    canReadCommittee,
    canEvaluateCommittee,
    canRecommendSupplier,
    canExportCommittee,
    canSubmit,
    isLoading,
    request,
    suppliers,
    articles,
    accessibleEnterprises,
    approvalHistory,
    canManageProformasFlow,
    canGenerateOrder,
    canEditRequest,
    totals,
    timeline,
    proformaComparison,
    commissionDecisionRows,
    saveMutation,
    submitMutation,
    approveMutation,
    rejectMutation,
    createProformaMutation,
    submitProformaMutation,
    approveProformaMutation,
    recommendProformaMutation,
    committeeEvaluationMutation,
    rejectProformaMutation,
    generateOrderMutation,
    updateLine,
    updateLineArticle,
    selectedSupplier,
  } = usePurchaseQuoteDetailPage();
  if (isLoading || !request) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats/devis">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux devis
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{request.number}</h1>
            <Badge variant={getStatusVariant(request.status)}>{statusLabels[request.status]}</Badge>
            {request.bonCommandeId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/achats/commandes?selectedOrderId=${request.bonCommandeId}`}>Voir le bon de commande</Link>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez ce devis interne et ses informations avant décision achat, validation PDG et conversion en bon de commande.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canExportCommittee && (
            <Button variant="outline" onClick={() => setIsCommissionPrintOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              PV commission
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          {canEditRequest && (
            <>
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
              >
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </>
          )}

          {canSubmit && (request.status === 'BROUILLON' || request.status === 'REJETEE') && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || lines.every((line) => !line.designation)}
            >
              <Send className="mr-2 h-4 w-4" />
              Soumettre au PDG
            </Button>
          )}

          {(canApprove || canReject) && request.status === 'SOUMISE' && (
            <>
              {canApprove && (
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Valider le devis
                </Button>
              )}
              {canReject && (
                <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={rejectMutation.isPending}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter
                </Button>
              )}
            </>
          )}

          {canManageProformasFlow && !request.bonCommandeId && (
            <Button variant="outline" onClick={() => setCreateProformaOpen(true)} disabled={createProformaMutation.isPending}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Nouvelle proforma
            </Button>
          )}

          {canGenerateOrder && (
            <Button onClick={() => generateOrderMutation.mutate()} disabled={generateOrderMutation.isPending}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Générer le BC
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Fournisseur du devis</div><div className="text-lg font-semibold">{selectedSupplier?.name || request.supplierName || request.manualSupplierName || 'A définir'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Montant TTC du devis</div><div className="text-lg font-semibold">{(request.montantTTC || request.estimatedAmount || 0) > 0 ? formatCurrency(request.montantTTC || request.estimatedAmount || 0) : '0 F CFA'}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Derniere etape</div><div className="text-lg font-semibold">{timeline[timeline.length - 1]?.title || 'Creation'}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="informations" className="space-y-6">
        <TabsList className="grid w-full max-w-[760px] grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="decision">Décision achat</TabsTrigger>
          <TabsTrigger value="proformas">Proformas</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="informations" className="space-y-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Informations du devis interne</CardTitle>
              <CardDescription>
                Gérez le devis interne, son fournisseur, ses lignes et ses montants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EditDpaCard
                canEdit={canEditRequest}
                title={title}
                onTitleChange={(value) => {
                  setIsDirty(true);
                  setTitle(value);
                }}
                enterpriseId={enterpriseId}
                enterprises={accessibleEnterprises}
                onEnterpriseChange={(value) => {
                  setIsDirty(true);
                  setEnterpriseId(value);
                }}
                dateBesoin={dateBesoin}
                onDateBesoinChange={(value) => {
                  setIsDirty(true);
                  setDateBesoin(value);
                }}
                supplierId={supplierId}
                suppliers={suppliers}
                onSupplierChange={(value) => {
                  setIsDirty(true);
                  setSupplierId(value);
                  if (value) {
                    setManualSupplierName('');
                  }
                }}
                manualSupplierName={manualSupplierName}
                onManualSupplierNameChange={(value) => {
                  setIsDirty(true);
                  setManualSupplierName(value);
                  if (value.trim()) {
                    setSupplierId('');
                  }
                }}
                notes={notes}
                onNotesChange={(value) => {
                  setIsDirty(true);
                  setNotes(value);
                }}
                description={description}
                onDescriptionChange={(value) => {
                  setIsDirty(true);
                  setDescription(value);
                }}
                lines={lines}
                articles={articles}
                onAddLine={() => {
                  setIsDirty(true);
                  setLines((current) => [...current, createEmptyDpaDraftLine()]);
                }}
                onDuplicateLine={(index) => {
                  setIsDirty(true);
                  setLines((current) => {
                    const source = current[index];
                    return [...current.slice(0, index + 1), { ...source, id: undefined }, ...current.slice(index + 1)];
                  });
                }}
                onRemoveLine={(index) => {
                  setIsDirty(true);
                  setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
                }}
                onUpdateLine={(index, patch) => {
                  setIsDirty(true);
                  updateLine(index, patch);
                }}
                onSelectArticle={(index, articleId) => {
                  setIsDirty(true);
                  updateLineArticle(index, articleId);
                }}
                formatCurrency={formatCurrency}
                totals={totals}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="space-y-6">
          <ProformaDecisionBoard
            request={request}
            proformas={proformaComparison.proformas}
            bestProformaId={proformaComparison.bestProformaId}
            bestAmount={proformaComparison.bestAmount}
            commissionDecisionRows={commissionDecisionRows}
            comparisonRows={proformaComparison.rows}
            canReadCommittee={canReadCommittee}
            canEvaluateCommittee={canEvaluateCommittee}
            canManageProformasFlow={canManageProformasFlow}
            canRecommendSupplier={canRecommendSupplier}
            isRecommendPending={recommendProformaMutation.isPending}
            savingCommitteeProformaId={committeeEvaluationMutation.variables?.proformaId || null}
            onRecommend={(proformaId) => recommendProformaMutation.mutate(proformaId)}
            onSaveCommitteeEvaluation={(proformaId, payload) =>
              committeeEvaluationMutation.mutate({ proformaId, payload })
            }
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="proformas" className="space-y-6">
          <ProformaSuppliersSection
            request={request}
            canManageProformasFlow={canManageProformasFlow}
            canApprove={canApprove}
            canReject={canReject}
            canGenerateOrder={canGenerateOrder}
            isRecommendPending={recommendProformaMutation.isPending}
            isSubmitPending={submitProformaMutation.isPending}
            isApprovePending={approveProformaMutation.isPending}
            isRejectPending={rejectProformaMutation.isPending}
            isGeneratePending={generateOrderMutation.isPending}
            onRecommend={(proformaId) => recommendProformaMutation.mutate(proformaId)}
            onSubmit={(proformaId) => submitProformaMutation.mutate(proformaId)}
            onApprove={(proformaId) => approveProformaMutation.mutate(proformaId)}
            onReject={(proforma) => setRejectProformaTarget(proforma)}
            onGenerateOrder={() => generateOrderMutation.mutate()}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        <TabsContent value="historique" className="space-y-6">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Timeline métier</CardTitle>
              <CardDescription>
                Chronologie du devis interne depuis sa création jusqu&apos;au bon de commande.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          item.tone === 'success'
                            ? 'bg-green-500'
                            : item.tone === 'warning'
                            ? 'bg-amber-500'
                            : item.tone === 'danger'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <div className="mt-1 h-full w-px bg-border" />
                    </div>
                    <div className="pb-4">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Historique du devis interne</CardTitle>
              <CardDescription>Journal détaillé des actions et transitions sur ce devis interne.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.actorServiceName || log.actorEmail || '-'}</TableCell>
                      <TableCell>{log.fromStatus} → {log.toStatus}</TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {approvalHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucun évènement de devis interne enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RejectPurchaseRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        requestNumber={request.number}
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          rejectMutation.mutate(reason, {
            onSuccess: () => {
              setRejectDialogOpen(false);
            },
          });
        }}
      />

      <RejectPurchaseRequestDialog
        open={Boolean(rejectProformaTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectProformaTarget(null);
        }}
        requestNumber={rejectProformaTarget?.numeroProforma}
        isPending={rejectProformaMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectProformaTarget) return;
          rejectProformaMutation.mutate({
            proformaId: rejectProformaTarget.id,
            commentaire: reason,
          });
        }}
      />

      <CreateProformaDialog
        open={createProformaOpen}
        onOpenChange={setCreateProformaOpen}
        suppliers={suppliers}
        articles={articles}
        defaultTitle={request.objet || request.title}
        defaultSupplierId={request.supplierId || undefined}
        isPending={createProformaMutation.isPending}
        onSubmit={(payload) => createProformaMutation.mutate(payload)}
      />

      {isPrintOpen && (
        <PurchaseRequestPrint
          request={{
            ...request,
            supplierName: selectedSupplier?.name || request.supplierName || null,
            lines: lines.map((line) => ({
              id: line.id,
              articleId: line.articleId || null,
              imageUrl: line.imageUrl || null,
              designation: line.designation,
              categorie: line.categorie || null,
              quantite: line.quantite,
              prixUnitaire: line.prixUnitaire,
              tva: line.tva,
              montantHT: line.quantite * line.prixUnitaire,
              montantTTC: line.quantite * line.prixUnitaire * (1 + line.tva / 100),
            })),
          }}
          supplier={selectedSupplier}
          articles={articles}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      {isCommissionPrintOpen && (
        <PurchaseCommissionPrint
          request={request}
          rows={commissionDecisionRows}
          onClose={() => setIsCommissionPrintOpen(false)}
        />
      )}
    </div>
  );
}
