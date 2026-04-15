'use client';

export type DpaDraftLine = {
  id?: string;
  articleId: string;
  imageUrl?: string;
  designation: string;
  categorie: string;
  unite?: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
};

export const createEmptyDpaDraftLine = (): DpaDraftLine => ({
  articleId: '',
  imageUrl: '',
  designation: '',
  categorie: '',
  unite: '',
  quantite: 1,
  prixUnitaire: 0,
  tva: 18,
});
