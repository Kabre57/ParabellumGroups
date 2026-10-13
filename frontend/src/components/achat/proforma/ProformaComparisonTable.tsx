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

export function ProformaComparisonTable(props: Pick<ProformaDecisionBoardProps, 'proformas' | 'comparisonRows' | 'bestProformaId' | 'formatCurrency'>) {
  const { proformas, comparisonRows, bestProformaId, formatCurrency } = props;
  return (
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
                                      {isSelected
                                        ? 'Retenue'
                                        : proforma.recommendedForApproval
                                        ? 'Recommandée'
                                        : offer.isLowest
                                        ? 'Moins cher'
                                        : 'Offre'}
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
  );
}
