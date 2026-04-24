export type RhPeriod = {
  month: number;
  year: number;
};

export type RhStatCard = {
  label: string;
  value: string | number;
  hint?: string;
};

export type RhFilterOption = {
  label: string;
  value: string | number;
};

export type RhFilterConfig = {
  key: string;
  label: string;
  options: RhFilterOption[];
};
