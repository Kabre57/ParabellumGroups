import type { User } from './entities';

// ==================== COMMERCIAL & PROSPECTION ====================

/**
 * Étapes du workflow de prospection
 */
export type ProspectStage =
  | 'preparation'
  | 'research'
  | 'contact'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'on_hold'
  | 'won'
  | 'lost';

/**
 * Priorités des prospects
 */
export type ProspectPriority = 'A' | 'B' | 'C' | 'D';

/**
 * Types d'activité de prospection
 */
export type ProspectActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'task'
  | 'conversion';

/**
 * Prospect
 */
export interface Prospect {
  id: string;
  companyName: string;
  contactName: string;
  civilite?: string;
  position?: string;
  email?: string;
  emailSecondaire?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  linkedin?: string;
  website?: string;
  sector?: string;
  idu?: string;
  ncc?: string;
  rccm?: string;
  codeActivite?: string;
  employees?: number;
  revenue?: number;
  address?: string;
  address2?: string;
  address3?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country: string;
  gpsCoordinates?: string;
  accessNotes?: string;
  stage: ProspectStage;
  priority: ProspectPriority;
  score: number;
  source?: string;
  assignedToId?: string;
  potentialValue?: number;
  closingProbability?: number;
  estimatedCloseDate?: string;
  notes?: string;
  tags: string[];
  isConverted: boolean;
  convertedAt?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  activities?: ProspectActivity[];
}

/**
 * Activité de prospection
 */
export interface ProspectActivity {
  id: string;
  prospectId: string;
  type: ProspectActivityType;
  subject: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  prospect?: Prospect;
  creator?: User;
}

/**
 * Statistiques de prospection
 */
export interface ProspectionStats {
  totalProspects: number;
  convertedProspects: number;
  conversionRate: number;
  recentActivities: number;
  byStage: Record<ProspectStage, number>;
  byPriority: Record<ProspectPriority, number>;
}

/**
 * Données de création de prospect
 */
export interface CreateProspectRequest {
  companyName: string;
  contactName: string;
  civilite?: string;
  position?: string;
  email?: string;
  emailSecondaire?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  linkedin?: string;
  website?: string;
  sector?: string;
  idu?: string;
  ncc?: string;
  rccm?: string;
  codeActivite?: string;
  employees?: number;
  revenue?: number;
  address?: string;
  address2?: string;
  address3?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  country?: string;
  gpsCoordinates?: string;
  accessNotes?: string;
  stage?: ProspectStage;
  priority?: ProspectPriority;
  source?: string;
  assignedToId?: string;
  potentialValue?: number;
  closingProbability?: number;
  estimatedCloseDate?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Données de mise à jour de prospect
 */
export interface UpdateProspectRequest extends Partial<CreateProspectRequest> {}

/**
 * Données de déplacement d'un prospect
 */
export interface MoveProspectRequest {
  stage: ProspectStage;
  notes?: string;
}

/**
 * Données de conversion d'un prospect
 */
export interface ConvertProspectRequest {
  customerId: string;
}

/**
 * Données de création d'activité
 */
export interface CreateProspectActivityRequest {
  type: ProspectActivityType;
  subject: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
}
