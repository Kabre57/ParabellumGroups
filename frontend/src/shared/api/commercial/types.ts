export type ProspectStage = 'preparation' | 'research' | 'contact' | 'discovery' | 'proposal' | 'won' | 'lost';
export type ProspectPriority = 'A' | 'B' | 'C';
export type ProspectActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note' | 'conversion';

export interface Prospect {
  id: string;
  companyName: string;
  contactName: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  sector?: string;
  employees?: number;
  revenue?: number;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
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
  email?: string;
  phone?: string;
  sector?: string;
  source?: string;
  assignedToId?: string;
}

export interface UpdateProspectRequest extends Partial<CreateProspectRequest> {
  stage?: ProspectStage;
  priority?: ProspectPriority;
}
