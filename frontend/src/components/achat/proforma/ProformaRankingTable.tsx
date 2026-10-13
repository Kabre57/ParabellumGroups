'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveProcurementCriteriaProfile } from './criteriaProfiles';
import type { ProformaDecisionBoardProps } from './proformaDecisionBoard.types';
import type { ProcurementCriteriaProfile } from './criteriaProfiles';

export function ProformaRankingTable(props: Pick<ProformaDecisionBoardProps, 'commissionDecisionRows' | 'bestProformaId' | 'canEvaluateCommittee' | 'canManageProformasFlow' | 'isRecommendPending' | 'onRecommend' | 'formatCurrency'> & { criteriaProfile: import('./criteriaProfiles').ProcurementCriteriaProfile | null; setActiveCommitteeProformaId: React.Dispatch<React.SetStateAction<string | null>> }) {
  const { commissionDecisionRows, bestProformaId, criteriaProfile, canEvaluateCommittee, setActiveCommitteeProformaId, canManageProformasFlow, isRecommendPending, onRecommend, formatCurrency } = props;
  return (
    <table className="w-full min-w-[1380px] text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <tr className="border-b">
                        <th className="px-3 py-3 font-semibold">Fournisseur</th>
                        <th className="px-3 py-3 font-semibold">Proforma</th>
                        <th className="px-3 py-3 font-semibold text-right">Total TTC</th>
                        <th className="px-3 py-3 font-semibold">Délai</th>
                        <th className="px-3 py-3 font-semibold">Disponibilité</th>
                        <th className="px-3 py-3 font-semibold text-right">Score technique</th>
                        <th className="px-3 py-3 font-semibold text-right">Score financier</th>
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
                                {isSelected ? <Badge>Retenue PDG</Badge> : null}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-medium">{row.numeroProforma}</div>
                              <div className="text-xs text-muted-foreground">{row.committeeDecision || 'Décision non signée'}</div>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                              {formatCurrency(row.montantTTC)}
                            </td>
                            <td className="px-3 py-3">{row.delaiLivraisonJours != null ? `${row.delaiLivraisonJours} j` : '—'}</td>
                            <td className="px-3 py-3">{row.disponibilite || '—'}</td>
                            <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.technicalScore.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{row.financialScore.toFixed(1)}</td>
                            <td className="px-3 py-3 text-right text-base font-semibold whitespace-nowrap">{row.totalScore.toFixed(1)}</td>
                            <td className="max-w-[320px] px-3 py-3 text-sm text-muted-foreground">
                              {row.justification || row.observationsAchat || '—'}
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant={isSelected ? 'default' : isRecommended ? 'secondary' : 'outline'}>
                                {isSelected ? 'Retenue PDG' : isRecommended ? 'Recommandée' : row.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                {criteriaProfile && canEvaluateCommittee ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setActiveCommitteeProformaId(row.proformaId)}
                                  >
                                    Commission
                                  </Button>
                                ) : null}
                                {canManageProformasFlow && !isSelected ? (
                                  <Button
                                    size="sm"
                                    variant={isRecommended ? 'secondary' : 'outline'}
                                    onClick={() => onRecommend(row.proformaId)}
                                    disabled={isRecommendPending}
                                  >
                                    {isRecommended ? 'Recommandée' : 'Retenir'}
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
  );
}
