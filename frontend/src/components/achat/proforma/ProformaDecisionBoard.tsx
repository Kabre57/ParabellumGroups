'use client';

import React from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProformaComparisonRow {
  key: string;
  designation: string;
  categorie: string;
  quantite: number;
  offers: Record<
    string,
    {
      prixUnitaire: number | null;
      montantTTC: number | null;
      isLowest: boolean;
    }
  >;
}

interface CommissionDecisionRow {
  proformaId: string;
  numeroProforma: string;
  fournisseurNom: string;
  montantTTC: number;
  delaiLivraisonJours: number | null;
  disponibilite: string | null;
  observationsAchat: string | null;
  status: string;
  selectedForOrder: boolean;
  recommendedForApproval: boolean;
  priceScore: number;
  delayScore: number;
  availabilityScore: number;
  supplierScore: number;
  totalScore: number;
  justification: string;
}

interface ProformaDecisionBoardProps {
  request: PurchaseRequest;
  proformas: PurchaseProforma[];
  bestProformaId: string | null;
  bestAmount: number;
  commissionDecisionRows: CommissionDecisionRow[];
  comparisonRows: ProformaComparisonRow[];
  canReadCommittee: boolean;
  canManageProformasFlow: boolean;
  canRecommendSupplier: boolean;
  isRecommendPending?: boolean;
  onRecommend: (proformaId: string) => void;
  formatCurrency: (amount: number) => string;
}

export function ProformaDecisionBoard({
  request,
  proformas,
  bestProformaId,
  bestAmount,
  commissionDecisionRows,
  comparisonRows,
  canReadCommittee,
  canManageProformasFlow,
  canRecommendSupplier,
  isRecommendPending = false,
  onRecommend,
  formatCurrency,
}: ProformaDecisionBoardProps) {
  if (!canReadCommittee) {
    return null;
  }

  const recommendedProforma = request.proformas?.find((item) => item.recommendedForApproval);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Tableau de décision achat</CardTitle>
        <CardDescription>
          Comparez les offres fournisseurs, le moins-disant, les délais et la recommandation achat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {proformas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Aucune proforma à comparer pour cette DPA.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Proformas reçues</div>
                <div className="mt-2 text-2xl font-semibold">{proformas.length}</div>
              </div>
              <div className="rounded-lg border bg-green-50 p-4">
                <div className="text-xs uppercase tracking-wide text-green-700">Meilleure offre globale</div>
                <div className="mt-2 text-lg font-semibold text-green-900">
                  {proformas.find((item) => item.id === bestProformaId)?.fournisseurNom || '—'}
                </div>
                <div className="text-sm text-green-800">{formatCurrency(bestAmount)}</div>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Proforma recommandée</div>
                <div className="mt-2 text-lg font-semibold">
                  {recommendedProforma?.fournisseurNom || 'Aucune recommandation'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {recommendedProforma?.numeroProforma || 'En attente de décision achat'}
                </div>
              </div>
            </div>

            {canManageProformasFlow && canRecommendSupplier && bestProformaId ? (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => onRecommend(bestProformaId)}
                  disabled={isRecommendPending}
                >
                  Retenir automatiquement le moins-disant
                </Button>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[1480px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-semibold">Fournisseur</th>
                    <th className="px-3 py-3 font-semibold">Proforma</th>
                    <th className="px-3 py-3 font-semibold text-right">Total TTC</th>
                    <th className="px-3 py-3 font-semibold text-right">Score prix</th>
                    <th className="px-3 py-3 font-semibold">Délai</th>
                    <th className="px-3 py-3 font-semibold text-right">Score délai</th>
                    <th className="px-3 py-3 font-semibold">Disponibilité</th>
                    <th className="px-3 py-3 font-semibold text-right">Score dispo</th>
                    <th className="px-3 py-3 font-semibold text-right">Score fournisseur</th>
                    <th className="px-3 py-3 font-semibold text-right">Score total</th>
                    <th className="px-3 py-3 font-semibold">Justification</th>
                    <th className="px-3 py-3 font-semibold">Statut</th>
                    <th className="px-3 py-3 font-semibold text-right">Décision</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionDecisionRows.map((row) => {
                    const isBest = row.proformaId === bestProformaId;
                    const isRecommended = row.recommendedForApproval;
                    const isSelected = row.selectedForOrder;

                    return (
                      <tr
                        key={`decision-${row.proformaId}`}
                        className={`border-b align-top last:border-0 ${
                          isSelected
                            ? 'bg-blue-50/60'
                            : isRecommended
                            ? 'bg-amber-50/60'
                            : isBest
                            ? 'bg-green-50/60'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium">{row.fournisseurNom}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {isBest ? <Badge variant="outline">Moins-disant</Badge> : null}
                            {isRecommended ? <Badge variant="secondary">Recommandée achat</Badge> : null}
                            {isSelected ? <Badge>Retenue DG</Badge> : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{row.numeroProforma}</div>
                          <div className="text-xs text-muted-foreground">{isBest ? 'Base comparatif' : 'Offre fournisseur'}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(row.montantTTC)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.priceScore.toFixed(1)}</td>
                        <td className="px-3 py-3">{row.delaiLivraisonJours != null ? `${row.delaiLivraisonJours} j` : '—'}</td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.delayScore.toFixed(1)}</td>
                        <td className="px-3 py-3">{row.disponibilite || '—'}</td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.availabilityScore.toFixed(1)}</td>
                        <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.supplierScore.toFixed(1)}</td>
                        <td className="px-3 py-3 text-right text-base font-semibold whitespace-nowrap">{row.totalScore.toFixed(1)}</td>
                        <td className="max-w-[320px] px-3 py-3 text-sm text-muted-foreground">
                          {row.justification || row.observationsAchat || '—'}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={isSelected ? 'default' : isRecommended ? 'secondary' : 'outline'}>
                            {isSelected ? 'Retenue DG' : isRecommended ? 'Recommandée' : row.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {canManageProformasFlow && !isSelected ? (
                            <Button
                              size="sm"
                              variant={isRecommended ? 'secondary' : 'outline'}
                              onClick={() => onRecommend(row.proformaId)}
                              disabled={isRecommendPending}
                            >
                              {isRecommended ? 'Recommandée' : 'Retenir'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr className="border-b">
                    <th className="min-w-[220px] px-3 py-3 font-semibold">Article</th>
                    <th className="w-24 px-3 py-3 font-semibold">Qté</th>
                    {proformas.map((proforma) => (
                      <th key={proforma.id} className="min-w-[180px] px-3 py-3 font-semibold">
                        <div>{proforma.fournisseurNom || 'Fournisseur'}</div>
                        <div className="mt-1 text-[11px] normal-case text-muted-foreground">
                          {proforma.numeroProforma} · {formatCurrency(proforma.montantTTC)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.key} className="border-b align-top last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium">{row.designation}</div>
                        <div className="text-xs text-muted-foreground">{row.categorie}</div>
                      </td>
                      <td className="px-3 py-3 text-base font-medium">{row.quantite}</td>
                      {proformas.map((proforma) => {
                        const offer = row.offers[proforma.id];
                        const isSelected = proforma.selectedForOrder;
                        return (
                          <td
                            key={`${row.key}-${proforma.id}`}
                            className={`px-3 py-3 ${
                              isSelected ? 'bg-blue-50/70' : offer?.isLowest ? 'bg-green-50/70' : ''
                            }`}
                          >
                            {offer?.prixUnitaire != null ? (
                              <div className="space-y-1">
                                <div
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    isSelected
                                      ? 'bg-blue-100 text-blue-700'
                                      : proforma.recommendedForApproval
                                      ? 'bg-amber-100 text-amber-700'
                                      : offer.isLowest
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {isSelected ? 'Retenue' : proforma.recommendedForApproval ? 'Recommandée' : offer.isLowest ? 'Moins cher' : 'Offre'}
                                </div>
                                <div className="text-base font-semibold whitespace-nowrap">PU {formatCurrency(offer.prixUnitaire)}</div>
                                <div className="text-sm text-muted-foreground whitespace-nowrap">
                                  TTC {formatCurrency(offer.montantTTC || 0)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Non chiffré</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td className="px-3 py-3 font-semibold">Total TTC</td>
                    <td />
                    {proformas.map((proforma) => (
                      <td
                        key={`total-${proforma.id}`}
                        className={`px-3 py-3 text-base font-semibold whitespace-nowrap ${
                          proforma.id === bestProformaId ? 'text-green-700' : ''
                        }`}
                      >
                        {formatCurrency(proforma.montantTTC)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProformaDecisionBoard;
