'use client';

import React from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { CheckCircle2, PackagePlus, Send, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProformaSuppliersSectionProps {
  request: PurchaseRequest;
  canManageProformasFlow: boolean;
  canApprove: boolean;
  canReject: boolean;
  canGenerateOrder: boolean;
  isSubmitPending?: boolean;
  isApprovePending?: boolean;
  isRejectPending?: boolean;
  isRecommendPending?: boolean;
  isGeneratePending?: boolean;
  onRecommend: (proformaId: string) => void;
  onSubmit: (proformaId: string) => void;
  onApprove: (proformaId: string) => void;
  onReject: (proforma: PurchaseProforma) => void;
  onGenerateOrder: () => void;
  formatCurrency: (amount: number) => string;
}

export function ProformaSuppliersSection({
  request,
  canManageProformasFlow,
  canApprove,
  canReject,
  canGenerateOrder,
  isSubmitPending = false,
  isApprovePending = false,
  isRejectPending = false,
  isRecommendPending = false,
  isGeneratePending = false,
  onRecommend,
  onSubmit,
  onApprove,
  onReject,
  onGenerateOrder,
  formatCurrency,
}: ProformaSuppliersSectionProps) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Proformas fournisseurs</CardTitle>
        <CardDescription>
          Gérez les proformas liées à ce devis interne, comparez-les et préparez la validation DG.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(request.proformas || []).length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Aucune proforma enregistrée pour ce devis interne.
          </div>
        ) : (
          (request.proformas || []).map((proforma) => (
            <div key={proforma.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{proforma.numeroProforma}</div>
                    <Badge variant={proforma.selectedForOrder ? 'default' : 'outline'}>
                      {proforma.selectedForOrder ? 'Retenue' : proforma.recommendedForApproval ? 'Recommandée achat' : proforma.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {proforma.fournisseurNom || 'Fournisseur non attribué'} · {formatCurrency(proforma.montantTTC)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      proforma.delaiLivraisonJours != null ? `Délai ${proforma.delaiLivraisonJours} j` : null,
                      proforma.disponibilite || null,
                      proforma.observationsAchat || proforma.notes || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Sans commentaire'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canManageProformasFlow && !proforma.selectedForOrder && (
                    <Button
                      size="sm"
                      variant={proforma.recommendedForApproval ? 'secondary' : 'outline'}
                      onClick={() => onRecommend(proforma.id)}
                      disabled={isRecommendPending}
                    >
                      {proforma.recommendedForApproval ? 'Recommandée' : 'Retenir'}
                    </Button>
                  )}
                  {canManageProformasFlow && (proforma.status === 'BROUILLON' || proforma.status === 'REJETEE') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSubmit(proforma.id)}
                      disabled={isSubmitPending}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Soumettre au DG
                    </Button>
                  )}

                  {canApprove && proforma.status === 'SOUMISE' && (
                    <Button size="sm" onClick={() => onApprove(proforma.id)} disabled={isApprovePending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Valider proforma
                    </Button>
                  )}

                  {canReject && proforma.status === 'SOUMISE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(proforma)}
                      disabled={isRejectPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeter proforma
                    </Button>
                  )}

                  {canGenerateOrder && proforma.status === 'APPROUVEE' && proforma.selectedForOrder && (
                    <Button size="sm" onClick={onGenerateOrder} disabled={isGeneratePending}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Générer le BC
                    </Button>
                  )}
                </div>
              </div>

              {(proforma.lignes || []).length > 0 && (
                <div className="mt-4 min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>PU</TableHead>
                        <TableHead>TVA</TableHead>
                        <TableHead className="text-right">Total TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(proforma.lignes || []).map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.designation}</TableCell>
                          <TableCell>{line.quantite}</TableCell>
                          <TableCell>{formatCurrency(line.prixUnitaire)}</TableCell>
                          <TableCell>{line.tva}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.montantTTC)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default ProformaSuppliersSection;
