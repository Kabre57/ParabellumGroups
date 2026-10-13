'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveProcurementCriteriaProfile } from './criteriaProfiles';
import type { ProformaDecisionBoardProps, CommitteeDraft, CommissionDecisionRow } from './proformaDecisionBoard.types';

export function CommitteeEvaluationForm(props: Pick<ProformaDecisionBoardProps, 'canEvaluateCommittee' | 'onSaveCommitteeEvaluation' | 'savingCommitteeProformaId'> & { criteriaProfile: import('./criteriaProfiles').ProcurementCriteriaProfile; activeCommitteeProforma: PurchaseProforma; activeDraft: CommitteeDraft; activeRow: CommissionDecisionRow | null; computedTechnicalTotal: number; setCommitteeDrafts: React.Dispatch<React.SetStateAction<Record<string, CommitteeDraft>>> }) {
  const { criteriaProfile, activeCommitteeProforma, activeDraft, activeRow, computedTechnicalTotal, canEvaluateCommittee, onSaveCommitteeEvaluation, savingCommitteeProformaId, setCommitteeDrafts } = props;
  return (
    <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Grille de commission</div>
                        <div className="text-lg font-semibold">
                          {activeCommitteeProforma.fournisseurNom || 'Fournisseur'} · {activeCommitteeProforma.numeroProforma}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Saisie officielle des critères éliminatoires, techniques et de la décision finale.
                        </div>
                      </div>
                      {activeRow ? (
                        <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                          Score technique: <strong>{activeRow.technicalScore.toFixed(1)}</strong> · Score financier:{' '}
                          <strong>{activeRow.financialScore.toFixed(1)}</strong> · Total:{' '}
                          <strong>{activeRow.totalScore.toFixed(1)}</strong>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="font-semibold">Critères éliminatoires</div>
                        {activeDraft.eliminatoryChecks.map((item, index) => (
                          <div key={`check-${item.criterionIndex}`} className="rounded-md border p-3">
                            <div className="font-medium">
                              {item.criterionIndex}. {item.label}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.requiredDocument || 'Pièce non précisée'}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`elim-${item.criterionIndex}`}
                                  checked={item.passed === true}
                                  onChange={() =>
                                    setCommitteeDrafts((current) => ({
                                      ...current,
                                      [activeCommitteeProforma.id]: {
                                        ...activeDraft,
                                        eliminatoryChecks: activeDraft.eliminatoryChecks.map((candidate, candidateIndex) =>
                                          candidateIndex === index ? { ...candidate, passed: true } : candidate
                                        ),
                                      },
                                    }))
                                  }
                                  disabled={!canEvaluateCommittee}
                                />
                                Oui
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`elim-${item.criterionIndex}`}
                                  checked={item.passed === false}
                                  onChange={() =>
                                    setCommitteeDrafts((current) => ({
                                      ...current,
                                      [activeCommitteeProforma.id]: {
                                        ...activeDraft,
                                        eliminatoryChecks: activeDraft.eliminatoryChecks.map((candidate, candidateIndex) =>
                                          candidateIndex === index ? { ...candidate, passed: false } : candidate
                                        ),
                                      },
                                    }))
                                  }
                                  disabled={!canEvaluateCommittee}
                                />
                                Non
                              </label>
                            </div>
                            <Textarea
                              value={item.notes}
                              onChange={(event) =>
                                setCommitteeDrafts((current) => ({
                                  ...current,
                                  [activeCommitteeProforma.id]: {
                                    ...activeDraft,
                                    eliminatoryChecks: activeDraft.eliminatoryChecks.map((candidate, candidateIndex) =>
                                      candidateIndex === index ? { ...candidate, notes: event.target.value } : candidate
                                    ),
                                  },
                                }))
                              }
                              className="mt-3 min-h-[70px]"
                              placeholder="Observation / document contrôlé"
                              disabled={!canEvaluateCommittee}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="font-semibold">Critères techniques</div>
                        {activeDraft.technicalScores.map((item, index) => (
                          <div key={`tech-${item.criterionIndex}`} className="rounded-md border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-medium">
                                {item.criterionIndex}. {item.label}
                              </div>
                              <div className="text-xs text-muted-foreground">Max {item.maxPoints} pts</div>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Note attribuée</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.maxPoints}
                                  value={item.points}
                                  onChange={(event) =>
                                    setCommitteeDrafts((current) => ({
                                      ...current,
                                      [activeCommitteeProforma.id]: {
                                        ...activeDraft,
                                        technicalScores: activeDraft.technicalScores.map((candidate, candidateIndex) =>
                                          candidateIndex === index
                                            ? {
                                                ...candidate,
                                                points: Math.max(
                                                  0,
                                                  Math.min(candidate.maxPoints, Number(event.target.value) || 0)
                                                ),
                                              }
                                            : candidate
                                        ),
                                      },
                                    }))
                                  }
                                  disabled={!canEvaluateCommittee}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Justification</label>
                                <Textarea
                                  value={item.notes}
                                  onChange={(event) =>
                                    setCommitteeDrafts((current) => ({
                                      ...current,
                                      [activeCommitteeProforma.id]: {
                                        ...activeDraft,
                                        technicalScores: activeDraft.technicalScores.map((candidate, candidateIndex) =>
                                          candidateIndex === index ? { ...candidate, notes: event.target.value } : candidate
                                        ),
                                      },
                                    }))
                                  }
                                  className="min-h-[70px]"
                                  placeholder="Arguments techniques / conformité"
                                  disabled={!canEvaluateCommittee}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-md border bg-slate-50 px-3 py-3 text-sm">
                          Total technique saisi : <strong>{computedTechnicalTotal.toFixed(1)} / 60</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-lg border p-4">
                        <div className="mb-2 font-semibold">Critère financier</div>
                        <div className="text-sm text-muted-foreground">
                          La note financière est calculée automatiquement à partir du moins-disant.
                        </div>
                        <Textarea
                          value={activeDraft.financialNotes}
                          onChange={(event) =>
                            setCommitteeDrafts((current) => ({
                              ...current,
                              [activeCommitteeProforma.id]: { ...activeDraft, financialNotes: event.target.value },
                            }))
                          }
                          className="mt-3 min-h-[80px]"
                          placeholder="Commentaire financier / analyse du prix"
                          disabled={!canEvaluateCommittee}
                        />
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Décision commission</label>
                            <select
                              value={activeDraft.decision}
                              onChange={(event) =>
                                setCommitteeDrafts((current) => ({
                                  ...current,
                                  [activeCommitteeProforma.id]: { ...activeDraft, decision: event.target.value },
                                }))
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              disabled={!canEvaluateCommittee}
                            >
                              <option value="">Décision non renseignée</option>
                              <option value="FAVORABLE">Favorable</option>
                              <option value="FAVORABLE_AVEC_RESERVE">Favorable avec réserve</option>
                              <option value="DEFAVORABLE">Défavorable</option>
                              <option value="RETENUE">Retenue</option>
                            </select>
                          </div>
                          <div className="rounded-md border bg-slate-50 px-3 py-3 text-sm">
                            Score total actuel : <strong>{activeRow?.totalScore.toFixed(1) || '0.0'}</strong>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <label className="text-sm font-medium">Justification / procès-verbal</label>
                          <Textarea
                            value={activeDraft.decisionNote}
                            onChange={(event) =>
                              setCommitteeDrafts((current) => ({
                                ...current,
                                [activeCommitteeProforma.id]: { ...activeDraft, decisionNote: event.target.value },
                              }))
                            }
                            className="min-h-[110px]"
                            placeholder="Motifs de choix, réserves, arguments de la commission"
                            disabled={!canEvaluateCommittee}
                          />
                        </div>

                        {canEvaluateCommittee && onSaveCommitteeEvaluation ? (
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                onSaveCommitteeEvaluation(activeCommitteeProforma.id, {
                                  profileCode: criteriaProfile.id,
                                  eliminatoryChecks: activeDraft.eliminatoryChecks,
                                  technicalScores: activeDraft.technicalScores,
                                  financialCriterion: {
                                    criterionIndex: criteriaProfile.financialCriteria[0]?.index || 15,
                                    label: criteriaProfile.financialCriteria[0]?.label || 'Offre économiquement la plus avantageuse',
                                    maxPoints: criteriaProfile.financialCriteria[0]?.points || 40,
                                    notes: activeDraft.financialNotes || null,
                                  },
                                  decision: activeDraft.decision || null,
                                  decisionNote: activeDraft.decisionNote || null,
                                  signDecision: false,
                                })
                              }
                              disabled={savingCommitteeProformaId === activeCommitteeProforma.id}
                            >
                              {savingCommitteeProformaId === activeCommitteeProforma.id ? 'Enregistrement...' : 'Enregistrer la grille'}
                            </Button>
                            <Button
                              onClick={() =>
                                onSaveCommitteeEvaluation(activeCommitteeProforma.id, {
                                  profileCode: criteriaProfile.id,
                                  eliminatoryChecks: activeDraft.eliminatoryChecks,
                                  technicalScores: activeDraft.technicalScores,
                                  financialCriterion: {
                                    criterionIndex: criteriaProfile.financialCriteria[0]?.index || 15,
                                    label: criteriaProfile.financialCriteria[0]?.label || 'Offre économiquement la plus avantageuse',
                                    maxPoints: criteriaProfile.financialCriteria[0]?.points || 40,
                                    notes: activeDraft.financialNotes || null,
                                  },
                                  decision: activeDraft.decision || null,
                                  decisionNote: activeDraft.decisionNote || null,
                                  signDecision: true,
                                })
                              }
                              disabled={savingCommitteeProformaId === activeCommitteeProforma.id}
                            >
                              {savingCommitteeProformaId === activeCommitteeProforma.id ? 'Signature...' : 'Signer la décision'}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
  );
}
