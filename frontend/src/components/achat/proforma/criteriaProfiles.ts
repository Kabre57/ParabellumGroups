'use client';

import type { PurchaseRequest } from '@/services/procurement';

export type ProcurementCriteriaProfile = {
  id: string;
  title: string;
  subtitle: string;
  internalComparisonLabel: string;
  eliminatoryCriteria: Array<{
    index: number;
    label: string;
    requiredDocument: string;
  }>;
  technicalCriteria: Array<{
    index: number;
    label: string;
    points: number;
  }>;
  financialCriteria: Array<{
    index: number;
    label: string;
    points: number;
  }>;
  technicalSpecifications: string[];
  schedule: Array<{
    label: string;
    value: string;
  }>;
};

const normalize = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');

export const PBL_PAYROLL_PROFILE: ProcurementCriteriaProfile = {
  id: 'PBL-payroll',
  title: "Grille RH - Logiciel de paie PBL",
  subtitle:
    "Cadre d'analyse officiel à utiliser par la commission achat et la RH pour les solutions de paie.",
  internalComparisonLabel:
    "Comparatif achat interne",
  eliminatoryCriteria: [
    { index: 1, label: "Déclaration Fiscale d'Existence (DFE)", requiredDocument: 'Copie de la DFE' },
    { index: 2, label: 'Registre de Commerce et du Crédit Mobilier (RCCM)', requiredDocument: 'Copie du RCCM' },
    { index: 3, label: "Présence physique en Côte d'Ivoire", requiredDocument: "Localisation de l'entreprise" },
    { index: 4, label: 'Spécialisation dans le domaine (Logiciel de paie)', requiredDocument: "Au moins 1 Attestation de Bonne Exécution (ABE)" },
    { index: 5, label: 'Identité du propriétaire', requiredDocument: 'Copie de la CNI' },
    { index: 6, label: 'Informations bancaires', requiredDocument: "Relevé d'Identité Bancaire (RIB)" },
  ],
  technicalCriteria: [
    { index: 7, label: "Ancienneté (Au moins 5 ans d'existence dans le domaine)", points: 10 },
    { index: 8, label: 'Références techniques (Au moins 3 ABE pour fourniture de logiciel de paie)', points: 10 },
    { index: 9, label: 'Description de la solution (Nom, version, mode d’hébergement)', points: 10 },
    { index: 10, label: 'Planification (Chronogramme et plan de formation)', points: 10 },
    { index: 11, label: 'Garantie et Livraison (Durée de garantie et délai de livraison)', points: 10 },
    { index: 12, label: 'Technique et Accompagnement (Architecture, sécurité, confidentialité, modalités de formation)', points: 10 },
  ],
  financialCriteria: [
    { index: 15, label: 'Offre économiquement la plus avantageuse', points: 40 },
  ],
  technicalSpecifications: [
    'Conformité légale ivoirienne : Code du travail, CNPS, DGI, CMU, ITS.',
    'Effectif initial de 25 à 50 salariés, évolutif jusqu’à 100.',
    'Calcul automatique, bulletins PDF, exports DISA/DGI, rapports RH.',
    'Hébergement cloud, SaaS recommandé.',
    'Formation de 2 à 4 utilisateurs, mises à jour légales automatiques et garantie de conformité.',
  ],
  schedule: [
    { label: 'Date limite de soumission', value: '31 mars 2026 à 17h00 GMT' },
    { label: "Validité de l'offre", value: '90 jours' },
    { label: 'Paiement', value: '50% après livraison, 50% après formation et rapport' },
    { label: 'Fiscalité', value: 'Prix Hors Taxes (PBL exonéré de TVA)' },
  ],
};

export function resolveProcurementCriteriaProfile(
  request?: PurchaseRequest | null
): ProcurementCriteriaProfile | null {
  if (!request) return null;

  const haystack = normalize(
    [
      request.serviceName,
      request.objet,
      request.title,
      request.description,
      request.notes,
    ]
      .filter(Boolean)
      .join(' ')
  );

  const matchesPayroll =
    haystack.includes('logiciel de paie') ||
    haystack.includes('paie') ||
    haystack.includes('PBL') ||
    haystack.includes('ressources humaines') ||
    haystack.includes('rh');

  return matchesPayroll ? PBL_PAYROLL_PROFILE : null;
}
