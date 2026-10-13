/**
 * Regroupe les libellés et calculs dérivés de la fiche de devis achat.
 */
import type {
  PurchaseProforma,
  PurchaseRequest,
  PurchaseRequestApprovalLog,
  PurchaseRequestStatus,
} from '@/services/procurement';

export type TimelineItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
};

export type ProformaComparisonSummary = {
  proformas: PurchaseProforma[];
  bestProformaId: string | null;
  bestAmount: number;
  recommendedProformaId: string | null;
  rows: Array<{
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
  }>;
};

export type CommissionDecisionRow = {
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
};

export const statusLabels: Record<PurchaseRequestStatus, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  APPROUVEE: 'Validée PDG',
  REJETEE: 'Rejetee',
  PROFORMAS_EN_COURS: 'Proformas en préparation',
  PROFORMA_SOUMISE: 'Proforma soumise PDG',
  PROFORMA_APPROUVEE: 'Proforma validée',
  COMMANDEE: 'Convertie en BC',
};

export const getStatusVariant = (status: PurchaseRequestStatus) => {
  switch (status) {
    case 'SOUMISE':
      return 'warning' as const;
    case 'APPROUVEE':
      return 'success' as const;
    case 'PROFORMAS_EN_COURS':
      return 'outline' as const;
    case 'PROFORMA_SOUMISE':
      return 'warning' as const;
    case 'PROFORMA_APPROUVEE':
      return 'success' as const;
    case 'REJETEE':
      return 'destructive' as const;
    case 'COMMANDEE':
      return 'success' as const;
    default:
      return 'outline' as const;
  }
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('fr-FR');
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

const normalizeAvailability = (value?: string | null) => String(value || '').trim().toLowerCase();

const computeAvailabilityScore = (availability?: string | null) => {
  const normalized = normalizeAvailability(availability);
  if (!normalized) return 6;
  if (normalized.includes('stock') || normalized.includes('immédiat') || normalized.includes('immediat')) return 15;
  if (normalized.includes('partiel')) return 10;
  if (normalized.includes('commande')) return 6;
  if (normalized.includes('rupture') || normalized.includes('indisponible')) return 0;
  return 8;
};

export const parseEnterpriseId = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeTimeline = (
  request: PurchaseRequest | undefined,
  approvalHistory: PurchaseRequestApprovalLog[]
): TimelineItem[] => {
  if (!request) return [];

  const items: TimelineItem[] = [
    {
      id: `created-${request.id}`,
      title: 'Devis interne créé',
      description: `Creation du devis interne ${request.number}.`,
      createdAt: request.date,
      tone: 'neutral',
    },
  ];

  approvalHistory.forEach((log) => {
    const tone =
      log.action === 'APPROVED'
        ? 'success'
        : log.action === 'REJECTED'
        ? 'danger'
        : log.action === 'SUBMITTED'
        ? 'warning'
        : 'neutral';

    items.push({
      id: log.id,
      title: log.action === 'SUBMITTED'
        ? 'Soumission pour approbation'
        : log.action === 'APPROVED'
        ? 'Approbation'
        : log.action === 'REJECTED'
        ? 'Rejet'
        : log.action,
      description: [
        log.actorServiceName || log.actorEmail || 'Acteur inconnu',
        log.commentaire || null,
        `Transition ${log.fromStatus} -> ${log.toStatus}`,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: log.createdAt,
      tone,
    });
  });

  (request.proformas || []).forEach((proforma) => {
    items.push({
      id: `proforma-created-${proforma.id}`,
      title: `Proforma créée (${proforma.numeroProforma})`,
      description: [proforma.fournisseurNom || 'Fournisseur inconnu', `Montant ${formatCurrency(proforma.montantTTC)}`]
        .filter(Boolean)
        .join(' · '),
      createdAt: proforma.createdAt || request.date,
      tone: 'neutral',
    });

    (proforma.approvalHistory || []).forEach((log) => {
      const tone =
        log.action === 'APPROVED'
          ? 'success'
          : log.action === 'REJECTED'
          ? 'danger'
          : log.action === 'SUBMITTED'
          ? 'warning'
          : 'neutral';

      items.push({
        id: `proforma-${proforma.id}-${log.id}`,
        title:
          log.action === 'SUBMITTED'
            ? `Proforma soumise (${proforma.numeroProforma})`
            : log.action === 'APPROVED'
            ? `Proforma validée (${proforma.numeroProforma})`
            : log.action === 'REJECTED'
            ? `Proforma rejetée (${proforma.numeroProforma})`
            : `${log.action} (${proforma.numeroProforma})`,
        description: [
          proforma.fournisseurNom || null,
          log.actorServiceName || log.actorEmail || null,
          log.commentaire || null,
        ]
          .filter(Boolean)
          .join(' · '),
        createdAt: log.createdAt,
        tone,
      });
    });
  });

  if (request.bonCommandeId) {
    items.push({
      id: `bc-${request.bonCommandeId}`,
      title: 'Bon de commande généré',
      description: `Le devis interne a ete converti en bon de commande ${request.numeroBon || request.bonCommandeId}.`,
      createdAt: request.approvedAt || request.date,
      tone: 'success',
    });
  }

  return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
};

export const buildProformaComparison = (request?: PurchaseRequest): ProformaComparisonSummary => {
  const proformas = [...(request?.proformas || [])].sort((left, right) => left.montantTTC - right.montantTTC);
  const bestAmount = proformas.length > 0 ? proformas[0].montantTTC : 0;
  const bestProformaId = proformas.length > 0 ? proformas[0].id : null;
  const recommendedProformaId =
    proformas.find((proforma) => proforma.recommendedForApproval)?.id || null;
  const sourceLines = request?.lines || [];

  const rows = sourceLines.map((line, index) => {
    const key =
      line.articleId ||
      line.referenceArticle ||
      `${line.designation.trim().toLowerCase()}-${index}`;

    const rawOffers = Object.fromEntries(
      proformas.map((proforma) => {
        const matchingLine =
          (proforma.lignes || []).find((candidate) =>
            line.articleId
              ? candidate.articleId === line.articleId
              : candidate.designation.trim().toLowerCase() === line.designation.trim().toLowerCase()
          ) || null;

        return [
          proforma.id,
          {
            prixUnitaire: matchingLine ? matchingLine.prixUnitaire : null,
            montantTTC: matchingLine ? matchingLine.montantTTC : null,
            isLowest: false,
          },
        ];
      })
    ) as Record<string, { prixUnitaire: number | null; montantTTC: number | null; isLowest: boolean }>;

    const unitPrices = Object.values(rawOffers)
      .map((offer) => offer.prixUnitaire)
      .filter((value): value is number => value != null && value > 0);
    const lowestUnitPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : null;

    const offers = Object.fromEntries(
      Object.entries(rawOffers).map(([proformaId, offer]) => [
        proformaId,
        {
          ...offer,
          isLowest: lowestUnitPrice != null && offer.prixUnitaire === lowestUnitPrice,
        },
      ])
    );

    return {
      key,
      designation: line.designation,
      categorie: line.categorie || '-',
      quantite: line.quantite,
      offers,
    };
  });

  return { proformas, bestProformaId, bestAmount, recommendedProformaId, rows };
};

export const buildCommissionDecisionRows = (
  request: PurchaseRequest | undefined,
  supplierRatings: Map<string, number>
): CommissionDecisionRow[] => {
  const proformas = [...(request?.proformas || [])];
  if (proformas.length === 0) {
    return [];
  }

  const bestAmount = Math.min(...proformas.map((proforma) => proforma.montantTTC || 0).filter((amount) => amount > 0));
  const deliveryCandidates = proformas
    .map((proforma) => proforma.delaiLivraisonJours)
    .filter((value): value is number => value != null && value >= 0);
  const bestDelay = deliveryCandidates.length > 0 ? Math.min(...deliveryCandidates) : null;

  return proformas
    .map((proforma) => {
      const supplierRating = supplierRatings.get(proforma.fournisseurId) ?? 3;
      const fallbackFinancialScore =
        bestAmount > 0 && proforma.montantTTC > 0 ? clampScore((bestAmount / proforma.montantTTC) * 50) : 0;
      const delayScore =
        bestDelay != null && proforma.delaiLivraisonJours != null && proforma.delaiLivraisonJours > 0
          ? clampScore((bestDelay / proforma.delaiLivraisonJours) * 20)
          : bestDelay === 0 && proforma.delaiLivraisonJours === 0
          ? 20
          : 0;
      const availabilityScore = computeAvailabilityScore(proforma.disponibilite);
      const supplierScore = clampScore((Math.max(0, Math.min(supplierRating, 5)) / 5) * 15);
      const fallbackTechnicalScore = clampScore(delayScore + availabilityScore + supplierScore);
      const committeeEvaluation = proforma.committeeEvaluation;
      const financialScore = committeeEvaluation?.financialScore ?? fallbackFinancialScore;
      const technicalScore = committeeEvaluation?.technicalTotal ?? fallbackTechnicalScore;
      const totalScore = committeeEvaluation?.totalScore ?? clampScore(technicalScore + financialScore);

      const justification = [
        committeeEvaluation?.decisionNote || null,
        proforma.recommendedForApproval ? 'Recommandée par le service achat' : null,
        proforma.selectedForOrder ? 'Retenue après validation PDG' : null,
        bestAmount > 0 && proforma.montantTTC === bestAmount ? 'Offre la moins-disante' : null,
        proforma.observationsAchat || null,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        proformaId: proforma.id,
        numeroProforma: proforma.numeroProforma,
        fournisseurNom: proforma.fournisseurNom || 'Fournisseur',
        montantTTC: proforma.montantTTC,
        delaiLivraisonJours: proforma.delaiLivraisonJours ?? null,
        disponibilite: proforma.disponibilite || null,
        observationsAchat: proforma.observationsAchat || proforma.notes || null,
        status: proforma.status,
        selectedForOrder: Boolean(proforma.selectedForOrder),
        recommendedForApproval: Boolean(proforma.recommendedForApproval),
        financialScore,
        technicalScore,
        totalScore,
        committeeDecision: committeeEvaluation?.decision || proforma.committeeDecision || null,
        justification,
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore);
};
