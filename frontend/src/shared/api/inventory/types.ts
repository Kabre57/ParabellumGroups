export type ArticleStatus = 'ACTIF' | 'INACTIF' | 'OBSOLETE';

export type ArticleUnit = 'PIECE' | 'KG' | 'M' | 'L';

export interface InventoryArticle {
  id: string;
  reference?: string;
  nom: string;
  description?: string;
  categorie?: string;
  unite?: ArticleUnit;
  prixAchat?: number;
  prixVente?: number;
  quantiteStock?: number;
  seuilAlerte?: number;
  seuilRupture?: number;
  emplacement?: string;
  fournisseurId?: string;
  status?: ArticleStatus;
  updatedAt?: string;
}

export type StockMovementType = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'TRANSFERT';

export interface StockMovement {
  id: string;
  articleId: string;
  type: StockMovementType;
  quantite: number;
  dateOperation?: string;
  utilisateurId?: string;
  numeroDocument?: string;
  emplacement?: string;
  notes?: string;
  article?: InventoryArticle;
}
