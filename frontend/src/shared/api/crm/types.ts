export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListMeta {
  pagination?: PaginationMeta;
  [key: string]: any;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: ListMeta;
  message?: string;
}

export interface DetailResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
  message?: string;
}

export interface StatsResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
}

export interface EmptyResponse {
  success: boolean;
  message?: string;
}

export interface Address {
  id?: string;
  clientId?: string;
  typeAdresse: 'FACTURATION' | 'LIVRAISON' | 'SIEGE_SOCIAL' | 'ETABLISSEMENT' | 'CORRESPONDANCE';
  nomAdresse?: string;
  ligne1: string;
  ligne2?: string;
  ligne3?: string;
  codePostal: string;
  ville: string;
  region?: string;
  pays: string;
  isPrincipal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TypeClient {
  id: string;
  code: string;
  libelle: string;
  couleur?: string;
  icone?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SecteurActivite {
  id: string;
  libelle: string;
  codeNAF?: string;
  niveau?: number;
  createdAt?: string;
}

export interface Contact {
  id: string;
  clientId: string;
  civilite?: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  poste?: string;
  departement?: string;
  type: string;
  statut: string;
  principal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  reference: string;
  nom: string;
  raisonSociale?: string;
  siret?: string;
  tvaIntra?: string;
  email: string;
  telephone?: string;
  mobile?: string;
  siteWeb?: string;
  status: 'PROSPECT' | 'ACTIF' | 'INACTIF' | 'SUSPENDU' | 'ARCHIVE' | 'LEAD_CHAUD' | 'LEAD_FROID';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
  typeClientId: string;
  typeClient?: TypeClient;
  secteurActiviteId?: string;
  secteurActivite?: SecteurActivite;
  contacts?: Contact[];
  adresses?: Address[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts: number;
    contrats: number;
    interactions: number;
    opportunites: number;
  };
}

export interface Contrat {
  id: string;
  clientId: string;
  reference: string;
  numeroContrat?: string;
  titre: string;
  description?: string;
  typeContrat: string;
  dateDebut: string;
  dateFin?: string;
  status: string;
  montantHT: number;
  montantTTC: number;
  devise: string;
  client?: Partial<Client>;
}

export interface Interaction {
  id: string;
  clientId: string;
  contactId?: string;
  type: string;
  canal: string;
  sujet: string;
  description?: string;
  dateInteraction: string;
  resultat?: string;
  client?: {
    nom: string;
    raisonSociale?: string;
  };
  contact?: {
    nom: string;
    prenom: string;
  };
  createdAt?: string;
}

export interface Opportunite {
  id: string;
  clientId: string;
  nom: string;
  description?: string;
  montantEstime: number;
  probabilite: number;
  dateFermetureEstimee?: string;
  etape: string;
  statut: string;
  client?: Partial<Client>;
}

export interface Document {
  id: string;
  typeDocument: string;
  nomFichier: string;
  taille: number;
  mimeType: string;
  estValide: boolean;
  dateUpload: string;
  confidential: boolean;
  description?: string;
}

export interface Avenant {
  id: string;
  numeroAvenant?: string;
  description?: string;
  dateEffet?: string;
  montantAdditionnel?: number;
  createdAt?: string;
}

export interface ClientsStats {
  totals: {
    all: number;
    active: number;
    newThisMonth: number;
    growthRate: string;
  };
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  revenue: {
    totalHT: number;
    totalTTC: number;
    averageContractValue: number;
  };
  conversions?: Record<string, number>;
}

export interface ContratsStats {
  totals: {
    all: number;
    activeValue: number;
  };
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  alerts: {
    upcomingRenewals: number;
    expiringSoon: number;
  };
}

export interface ContratsExpiring {
  data: Contrat[];
  meta: {
    thresholdDays: number;
    thresholdDate: string;
    count: number;
  };
}

export interface InteractionsStats {
  totals: {
    interactions: number;
    averageDuration: number;
  };
  byType: Record<string, number>;
  byCanal: Record<string, number>;
  byResultat: Record<string, number>;
}

export interface OpportunitesPipeline {
  pipeline: Record<string, any>;
  byStatut: Record<string, any>;
  totals: {
    pipelineValue: number;
    wonValue: number;
    conversionRate: string;
  };
}

export interface DocumentsExpiring {
  expiring: Document[];
  expired: Document[];
  meta: {
    thresholdDays: number;
    thresholdDate: string;
    expiringCount: number;
    expiredCount: number;
  };
}

export interface SecteurTreeItem {
  id: string;
  codeNAF?: string;
  libelle: string;
  niveau?: number;
  enfants?: SecteurTreeItem[];
}
