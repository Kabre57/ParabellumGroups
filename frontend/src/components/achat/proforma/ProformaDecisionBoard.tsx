'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveProcurementCriteriaProfile } from './criteriaProfiles';

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
  financialScore: number;
  technicalScore: number;
  totalScore: number;
  committeeDecision: string | null;
  justification: string;
}

type CommitteeDraft = {
  eliminatoryChecks: Array<{
    criterionIndex: number;
    label: string;
    requiredDocument?: string | null;
    passed: boolean | null;
    notes: string;
  }>;
  technicalScores: Array<{
    criterionIndex: number;
    label: string;
    maxPoints: number;
    points: number;
    notes: string;
  }>;
  financialNotes: string;
  decision: string;
  decisionNote: string;
};

interface ProformaDecisionBoardProps {
  request: PurchaseRequest;
  proformas: PurchaseProforma[];
  bestProformaId: string | null;
  bestAmount: number;
  commissionDecisionRows: CommissionDecisionRow[];
  comparisonRows: ProformaComparisonRow[];
  canReadCommittee: boolean;
  canEvaluateCommittee?: boolean;
  canManageProformasFlow: boolean;
  canRecommendSupplier: boolean;
  isRecommendPending?: boolean;
  savingCommitteeProformaId?: string | null;
  onRecommend: (proformaId: string) => void;
  onSaveCommitteeEvaluation?: (
    proformaId: string,
    payload: {
      profileCode?: string;
      eliminatoryChecks: CommitteeDraft['eliminatoryChecks'];
      technicalScores: CommitteeDraft['technicalScores'];
      financialCriterion: { criterionIndex: number; label: string; maxPoints: number; notes?: string | null };
      decision?: string | null;
      decisionNote?: string | null;
      signDecision?: boolean;
    }
  ) => void;
  formatCurrency: (amount: number) => string;
}

const buildCommitteeDraft = (proforma: PurchaseProforma, request: PurchaseRequest): CommitteeDraft | null => {
  const profile = resolveProcurementCriteriaProfile(request);
  if (!profile) return null;

  return {
    eliminatoryChecks: profile.eliminatoryCriteria.map((criterion) => {
      const existing = proforma.committeeEvaluation?.eliminatoryChecks?.find(
        (item) => item.criterionIndex === criterion.index
      );
      return {
        criterionIndex: criterion.index,
        label: criterion.label,
        requiredDocument: criterion.requiredDocument,
        passed: existing?.passed ?? null,
        notes: existing?.notes || '',
      };
    }),
    technicalScores: profile.technicalCriteria.map((criterion) => {
      const existing = proforma.committeeEvaluation?.technicalScores?.find(
        (item) => item.criterionIndex === criterion.index
      );
      return {
        criterionIndex: criterion.index,
        label: criterion.label,
        maxPoints: criterion.points,
        points: existing?.points ?? 0,
        notes: existing?.notes || '',
      };
    }),
    financialNotes: proforma.committeeEvaluation?.financialCriterion?.notes || '',
    decision: proforma.committeeEvaluation?.decision || proforma.committeeDecision || '',
    decisionNote: proforma.committeeEvaluation?.decisionNote || proforma.committeeDecisionNote || '',
  };
};

export function ProformaDecisionBoard({
  request,
  proformas,
  bestProformaId,
  bestAmount,
  commissionDecisionRows,
  comparisonRows,
  canReadCommittee,
  canEvaluateCommittee = false,
  canManageProformasFlow,
  canRecommendSupplier,
  isRecommendPending = false,
  savingCommitteeProformaId = null,
  onRecommend,
  onSaveCommitteeEvaluation,
  formatCurrency,
}: ProformaDecisionBoardProps) {
  const criteriaProfile = resolveProcurementCriteriaProfile(request);
  const [activeCommitteeProformaId, setActiveCommitteeProformaId] = useState<string | null>(null);
  const [committeeDrafts, setCommitteeDrafts] = useState<Record<string, CommitteeDraft>>({});

  useEffect(() => {
    if (!criteriaProfile) return;

    setCommitteeDrafts((current) => {
      const next = { ...current };
      proformas.forEach((proforma) => {
        next[proforma.id] = buildCommitteeDraft(proforma, request) || current[proforma.id];
      });
      return next;
    });

    if (!activeCommitteeProformaId && proformas.length > 0) {
      setActiveCommitteeProformaId(proformas[0].id);
    }
  }, [activeCommitteeProformaId, criteriaProfile, proformas, request]);

  const recommendedProforma = request.proformas?.find((item) => item.recommendedForApproval);
  const activeCommitteeProforma = proformas.find((item) => item.id === activeCommitteeProformaId) || null;
  const activeDraft = activeCommitteeProformaId ? committeeDrafts[activeCommitteeProformaId] : undefined;
  const activeRow = commissionDecisionRows.find((row) => row.proformaId === activeCommitteeProformaId) || null;
  const computedTechnicalTotal = useMemo(
    () => (activeDraft ? activeDraft.technicalScores.reduce((sum, item) => sum + Number(item.points || 0), 0) : 0),
    [activeDraft]
  );

  if (!canReadCommittee) {
    return null;
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Tableau de décision achat</CardTitle>
        <CardDescription>
          Comparez les offres, renseignez la commission achat et préparez la décision DG.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {proformas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Aucune proforma à comparer pour ce devis interne.
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

            {criteriaProfile ? (
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
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
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
                            {isSelected ? <Badge>Retenue DG</Badge> : null}
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
                            {isSelected ? 'Retenue DG' : isRecommended ? 'Recommandée' : row.status}
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
            </div>

            {criteriaProfile && activeCommitteeProforma && activeDraft ? (
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
            ) : null}

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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProformaDecisionBoard;
