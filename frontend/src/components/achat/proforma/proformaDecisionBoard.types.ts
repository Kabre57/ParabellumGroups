import type { Dispatch, SetStateAction } from 'react';
import type { PurchaseProforma, PurchaseRequest } from '@/services/procurement';

export interface ProformaComparisonRow {
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

export interface CommissionDecisionRow {
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

export type CommitteeDraft = {
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

export interface ProformaDecisionBoardProps {
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
