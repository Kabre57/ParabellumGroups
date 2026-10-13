// Normalisation et calcul des evaluations du comite.
const parseNullableNonNegativeInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const normalizeOptionalText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const clampCommitteeScore = (value, maxPoints) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Number(maxPoints || 0), Math.round(parsed * 100) / 100));
};

const normalizeCommitteeChecks = (items = []) =>
  Array.isArray(items)
    ? items.map((item) => ({
        criterionIndex: Number(item?.criterionIndex ?? 0),
        label: String(item?.label || '').trim(),
        requiredDocument: normalizeOptionalText(item?.requiredDocument),
        passed:
          item?.passed === true || item?.passed === false
            ? Boolean(item.passed)
            : null,
        notes: normalizeOptionalText(item?.notes),
      }))
    : [];

const normalizeCommitteeScores = (items = []) =>
  Array.isArray(items)
    ? items.map((item) => {
        const maxPoints = clampCommitteeScore(item?.maxPoints ?? 0, Number(item?.maxPoints ?? 0));
        return {
          criterionIndex: Number(item?.criterionIndex ?? 0),
          label: String(item?.label || '').trim(),
          maxPoints,
          points: clampCommitteeScore(item?.points ?? 0, maxPoints),
          notes: normalizeOptionalText(item?.notes),
        };
      })
    : [];

const sumCommitteeScores = (items = []) =>
  Math.round(items.reduce((sum, item) => sum + Number(item?.points || 0), 0) * 100) / 100;

const buildCommitteeEvaluation = ({
  profileCode,
  eliminatoryChecks,
  technicalScores,
  financialCriterion,
  decision,
  decisionNote,
  actor,
  signDecision = false,
}) => {
  const normalizedChecks = normalizeCommitteeChecks(eliminatoryChecks);
  const normalizedTechnicalScores = normalizeCommitteeScores(technicalScores);
  const normalizedFinancialCriterion = financialCriterion
    ? {
        criterionIndex: Number(financialCriterion?.criterionIndex ?? 0),
        label: String(financialCriterion?.label || '').trim(),
        maxPoints: clampCommitteeScore(
          financialCriterion?.maxPoints ?? 40,
          Number(financialCriterion?.maxPoints ?? 40)
        ),
        points: clampCommitteeScore(
          financialCriterion?.points ?? 0,
          Number(financialCriterion?.maxPoints ?? 40)
        ),
        notes: normalizeOptionalText(financialCriterion?.notes),
      }
    : null;

  const eliminatoryPassed = normalizedChecks.every((item) => item.passed !== false);
  const technicalTotal = sumCommitteeScores(normalizedTechnicalScores);
  const financialScore = normalizedFinancialCriterion ? Number(normalizedFinancialCriterion.points || 0) : 0;
  const totalScore = Math.round((technicalTotal + financialScore) * 100) / 100;
  const now = new Date();

  return {
    committeeProfileCode: normalizeOptionalText(profileCode),
    committeeDecision: normalizeOptionalText(decision),
    committeeDecisionNote: normalizeOptionalText(decisionNote),
    committeeEvaluatedAt: now,
    committeeEvaluatedByUserId: actor?.userId || null,
    committeeEvaluatedByEmail: actor?.email || null,
    committeeEvaluatedByServiceId: actor?.serviceId ?? null,
    committeeEvaluatedByServiceName: actor?.serviceName || null,
    committeeSignedAt: signDecision ? now : null,
    committeeSignedByUserId: signDecision ? actor?.userId || null : null,
    committeeSignedByEmail: signDecision ? actor?.email || null : null,
    committeeSignedByServiceId: signDecision ? actor?.serviceId ?? null : null,
    committeeSignedByServiceName: signDecision ? actor?.serviceName || null : null,
    committeeEvaluation: {
      profileCode: normalizeOptionalText(profileCode),
      eliminatoryChecks: normalizedChecks,
      eliminatoryPassed,
      technicalScores: normalizedTechnicalScores,
      technicalTotal,
      financialCriterion: normalizedFinancialCriterion,
      financialScore,
      totalScore,
      decision: normalizeOptionalText(decision),
      decisionNote: normalizeOptionalText(decisionNote),
      lastUpdatedAt: now.toISOString(),
      lastUpdatedByUserId: actor?.userId || null,
      lastUpdatedByEmail: actor?.email || null,
      lastUpdatedByServiceId: actor?.serviceId ?? null,
      lastUpdatedByServiceName: actor?.serviceName || null,
      signedAt: signDecision ? now.toISOString() : null,
      signedByUserId: signDecision ? actor?.userId || null : null,
      signedByEmail: signDecision ? actor?.email || null : null,
      signedByServiceId: signDecision ? actor?.serviceId ?? null : null,
      signedByServiceName: signDecision ? actor?.serviceName || null : null,
    },
  };
};

module.exports = { parseNullableNonNegativeInt, normalizeOptionalText, clampCommitteeScore, buildCommitteeEvaluation };
