import { referentielEtContrats } from './logipaieLabels/referentiel-et-contrats';
import { paieEtAbsences } from './logipaieLabels/paie-et-absences';
import { editionsEtDeclarations } from './logipaieLabels/editions-et-declarations';
import { syntheses } from './logipaieLabels/syntheses';
import { rhEtJournal } from './logipaieLabels/rh-et-journal';

/**
 * Réunit les libellés des feuilles Logipaie sous leur export historique.
 */
export const LOGIPAIE_SHEETS = {
  ...referentielEtContrats,
  ...paieEtAbsences,
  ...editionsEtDeclarations,
  ...syntheses,
  ...rhEtJournal,
} as const;

export type LogipaieSheetName = keyof typeof LOGIPAIE_SHEETS;
