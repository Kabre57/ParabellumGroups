export type PipelineStage = 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION' | 'NEGOCIATION' | 'FINALISATION';
export type PipelineStatus = 'OUVERTE' | 'GAGNEE' | 'PERDUE' | 'MISE_EN_ATTENTE';
export type PipelineColumnId = PipelineStage | 'GAGNEE' | 'PERDUE';

export interface PipelineOpportunity {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  etape?: PipelineStage;
  statut?: PipelineStatus;
  expectedCloseDate: string;
  lastActivity?: string;
  description?: string;
}

export interface OpportunityFormValues {
  nom: string;
  description?: string;
  montantEstime: number;
  probabilite: number;
  dateFermetureEstimee?: string;
  etape?: PipelineStage;
  statut?: PipelineStatus;
}

export const PIPELINE_COLUMNS: { id: PipelineColumnId; label: string; type: 'stage' | 'status' }[] = [
  { id: 'PROSPECTION', label: 'Prospection', type: 'stage' },
  { id: 'QUALIFICATION', label: 'Qualification', type: 'stage' },
  { id: 'PROPOSITION', label: 'Proposition', type: 'stage' },
  { id: 'NEGOCIATION', label: 'Negociation', type: 'stage' },
  { id: 'FINALISATION', label: 'Finalisation', type: 'stage' },
  { id: 'GAGNEE', label: 'Gagnee', type: 'status' },
  { id: 'PERDUE', label: 'Perdue', type: 'status' },
];

export const ETAPE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: 'PROSPECTION', label: 'Prospection' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'PROPOSITION', label: 'Proposition' },
  { value: 'NEGOCIATION', label: 'Negociation' },
  { value: 'FINALISATION', label: 'Finalisation' },
];

export const STATUT_OPTIONS: { value: PipelineStatus; label: string }[] = [
  { value: 'OUVERTE', label: 'Ouverte' },
  { value: 'GAGNEE', label: 'Gagnee' },
  { value: 'PERDUE', label: 'Perdue' },
  { value: 'MISE_EN_ATTENTE', label: 'Mise en attente' },
];
