export type ProspectStage =
  | 'preparation'
  | 'research'
  | 'contact'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'on_hold';
export type ProspectPriority = 'A' | 'B' | 'C' | 'D';
export type ProspectActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note' | 'conversion';

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
  creator?: any;
}

export type TerrainVisitStatus = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface TerrainVisit {
  id: string;
  prospect: Prospect;
  scheduledAt: string;
  assignee: string | null;
  status: TerrainVisitStatus;
  note?: string;
  outcome?: string | null;
}

export interface CreateTerrainVisitRequest {
  prospectId: string;
  scheduledAt?: string;
  assignee?: string;
  status?: TerrainVisitStatus;
  note?: string;
  subject?: string;
  location?: string;
}

export interface UpdateTerrainVisitRequest extends Partial<CreateTerrainVisitRequest> {}

export interface ProspectionStats {
  totalProspects: number;
  convertedProspects: number;
  conversionRate: number;
  recentActivities: number;
  byStage: Record<ProspectStage, number>;
  byPriority: Record<ProspectPriority, number>;
}

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

export interface UpdateProspectRequest extends Partial<CreateProspectRequest> {}
