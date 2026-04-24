export type ArticleStatus = 'ACTIF' | 'INACTIF' | 'OBSOLETE';

export type ArticleUnit = 'PIECE' | 'KG' | 'M' | 'L';

export interface InventoryArticle {
  id: string;
  reference?: string;
  nom: string;
  imageUrl?: string;
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

export type ReceptionStatus = 'EN_ATTENTE' | 'PARTIELLE' | 'COMPLETE' | 'VERIFIEE';

export interface ReceptionLine {
  id: string;
  articleId: string | null;
  designation?: string;
  imageUrl?: string | null;
  quantitePrev: number;
  quantiteRecue: number;
  prixUnitaire: number;
  tva?: number;
  ecart?: number;
  article?: InventoryArticle;
}

export interface Reception {
  id: string;
  numero: string;
  bonCommandeId: string;
  fournisseurId?: string;
  dateReception: string;
  status: ReceptionStatus;
  notes?: string;
  factureFournisseurUrl?: string | null;
  factureFournisseurName?: string | null;
  lignes: ReceptionLine[];
  createdAt?: string;
  updatedAt?: string;
}
