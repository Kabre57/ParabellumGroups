export type PlacementType = 'ACTION' | 'OBLIGATION' | 'TCN' | 'IMMOBILIER';
export type PlacementStatus = 'ACTIF' | 'CEDE' | 'FRACTIONNE' | 'ANNULE';

export interface PlacementSummary {
  totalInvested: number;
  currentValuation: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface PerformancePoint {
  date: string;
  totalValuation: number;
  totalInvested: number;
  roi: number;
}

export interface CreatePlacementPayload {
  name: string;
  issuer?: string;
  type: PlacementType;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency?: string;
  notes?: string;
}

export interface AddCoursePayload {
  id: string;
  value: number;
  atDate: string;
}
