export interface CreatePlacementForm {
  name: string;
  issuer?: string;
  type: 'ACTION' | 'OBLIGATION' | 'TCN' | 'IMMOBILIER';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: string;
  notes?: string;
}

export function validateCreatePlacement(data: Partial<CreatePlacementForm>): string | null {
  if (!data.name?.trim()) return 'La désignation est obligatoire.';
  if (!data.type) return 'Le type de placement est obligatoire.';
  if (!data.quantity || data.quantity <= 0) return 'La quantité doit être supérieure à 0.';
  if (!data.purchasePrice || data.purchasePrice <= 0) return "Le prix d'acquisition doit être supérieur à 0.";
  if (!data.purchaseDate) return "La date d'acquisition est obligatoire.";
  return null;
}
