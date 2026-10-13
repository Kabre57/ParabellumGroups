'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveProcurementCriteriaProfile } from './criteriaProfiles';
import { ProcurementCriteriaProfileView } from './ProcurementCriteriaProfileView';
import { ProformaRankingTable } from './ProformaRankingTable';
import { CommitteeEvaluationForm } from './CommitteeEvaluationForm';
import { ProformaComparisonTable } from './ProformaComparisonTable';

import type { CommitteeDraft, CommissionDecisionRow, ProformaComparisonRow, ProformaDecisionBoardProps } from './proformaDecisionBoard.types';

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
          Comparez les offres, renseignez la commission achat et préparez la décision PDG.
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
              <ProcurementCriteriaProfileView criteriaProfile={criteriaProfile} />
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
              <ProformaRankingTable commissionDecisionRows={commissionDecisionRows} bestProformaId={bestProformaId} criteriaProfile={criteriaProfile} canEvaluateCommittee={canEvaluateCommittee} canManageProformasFlow={canManageProformasFlow} isRecommendPending={isRecommendPending} onRecommend={onRecommend} formatCurrency={formatCurrency} setActiveCommitteeProformaId={setActiveCommitteeProformaId} />
            </div>

            {criteriaProfile && activeCommitteeProforma && activeDraft ? (
              <CommitteeEvaluationForm criteriaProfile={criteriaProfile} activeCommitteeProforma={activeCommitteeProforma} activeDraft={activeDraft} activeRow={activeRow} computedTechnicalTotal={computedTechnicalTotal} canEvaluateCommittee={canEvaluateCommittee} onSaveCommitteeEvaluation={onSaveCommitteeEvaluation} savingCommitteeProformaId={savingCommitteeProformaId} setCommitteeDrafts={setCommitteeDrafts} />
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
              <ProformaComparisonTable proformas={proformas} comparisonRows={comparisonRows} bestProformaId={bestProformaId} formatCurrency={formatCurrency} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProformaDecisionBoard;
