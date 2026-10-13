'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveProcurementCriteriaProfile } from './criteriaProfiles';
import type { ProcurementCriteriaProfile } from './criteriaProfiles';

export function ProcurementCriteriaProfileView(props: { criteriaProfile: ProcurementCriteriaProfile }) {
  const { criteriaProfile } = props;
  return (
    <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-wide text-blue-700">Profil d’évaluation actif</div>
                      <div className="text-lg font-semibold text-blue-950">{criteriaProfile.title}</div>
                      <div className="text-sm text-blue-900">{criteriaProfile.subtitle}</div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-lg border bg-white p-4">
                        <div className="mb-3 text-sm font-semibold">Critères éliminatoires</div>
                        <div className="space-y-2 text-sm">
                          {criteriaProfile.eliminatoryCriteria.map((criterion) => (
                            <div key={`elim-${criterion.index}`} className="rounded-md border p-3">
                              <div className="font-medium">
                                {criterion.index}. {criterion.label}
                              </div>
                              <div className="text-muted-foreground">
                                Pièce requise : {criterion.requiredDocument}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-white p-4">
                        <div className="mb-3 text-sm font-semibold">Critères de notation</div>
                        <div className="space-y-2 text-sm">
                          {criteriaProfile.technicalCriteria.map((criterion) => (
                            <div key={`tech-${criterion.index}`} className="flex items-start justify-between gap-3 rounded-md border p-3">
                              <div>
                                {criterion.index}. {criterion.label}
                              </div>
                              <div className="shrink-0 font-semibold">{criterion.points} pts</div>
                            </div>
                          ))}
                          {criteriaProfile.financialCriteria.map((criterion) => (
                            <div key={`fin-${criterion.index}`} className="flex items-start justify-between gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                              <div>
                                {criterion.index}. {criterion.label}
                              </div>
                              <div className="shrink-0 font-semibold">{criterion.points} pts</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-lg border bg-white p-4">
                        <div className="mb-3 text-sm font-semibold">Spécifications techniques minimales</div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {criteriaProfile.technicalSpecifications.map((item) => (
                            <li key={item} className="rounded-md border px-3 py-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border bg-white p-4">
                        <div className="mb-3 text-sm font-semibold">Calendrier et modalités</div>
                        <div className="space-y-2 text-sm">
                          {criteriaProfile.schedule.map((item) => (
                            <div key={item.label} className="rounded-md border px-3 py-2">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-muted-foreground">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
  );
}
