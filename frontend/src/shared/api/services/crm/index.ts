import { apiClient } from '../../client';

// ==================== TYPES ====================

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

// ==================== SERVICE ====================

export const crmService = {
  // --- CLIENTS ---
  async getClients(params?: any): Promise<ListResponse<Client>> {
    const response = await apiClient.get('/clients', { params });
    return response.data;
  },

  async getClient(id: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  async createClient(data: any): Promise<DetailResponse<Client>> {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },

  async updateClient(id: string, data: any): Promise<DetailResponse<Client>> {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data;
  },

  async searchClients(params?: any): Promise<ListResponse<Client>> {
    const response = await apiClient.get('/clients/search', { params });
    return response.data;
  },

  async getClientsStats(params?: any): Promise<StatsResponse<ClientsStats>> {
    const response = await apiClient.get('/clients/stats', { params });
    return response.data;
  },

  async updateClientStatus(id: string, status: Client['status'], raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.patch(`/clients/${id}/status`, { status, raison });
    return response.data;
  },

  async updateClientPriority(id: string, priorite: Client['priorite'], raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.patch(`/clients/${id}/priority`, { priorite, raison });
    return response.data;
  },

  async archiveClient(id: string, raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.delete(`/clients/${id}/archive`, {
      data: raison ? { raison } : undefined,
    });
    return response.data;
  },

  async deleteClient(id: string, raison?: string): Promise<DetailResponse<Client>> {
    const response = await apiClient.delete(`/clients/${id}/archive`, {
      data: raison ? { raison } : undefined,
    });
    return response.data;
  },

  // --- CONTACTS ---
  async getContacts(params?: any): Promise<ListResponse<Contact>> {
    const response = await apiClient.get('/contacts', { params });
    return response.data;
  },

  async getContact(id: string): Promise<DetailResponse<Contact>> {
    const response = await apiClient.get(`/contacts/${id}`);
    return response.data;
  },

  async createContact(data: any): Promise<DetailResponse<Contact>> {
    const response = await apiClient.post('/contacts', data);
    return response.data;
  },

  async updateContact(id: string, data: any): Promise<DetailResponse<Contact>> {
    const response = await apiClient.put(`/contacts/${id}`, data);
    return response.data;
  },

  async deleteContact(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/contacts/${id}`);
    return response.data;
  },

  async setContactPrincipal(id: string, principal: boolean): Promise<DetailResponse<Contact>> {
    const response = await apiClient.patch(`/contacts/${id}/principal`, { principal });
    return response.data;
  },

  // --- CONTRATS ---
  async getContrats(params?: any): Promise<ListResponse<Contrat>> {
    const response = await apiClient.get('/contrats', { params });
    return response.data;
  },

  async getContrat(id: string): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.get(`/contrats/${id}`);
    return response.data;
  },

  async createContrat(data: any): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.post('/contrats', data);
    return response.data;
  },

  async getContratsStats(params?: any): Promise<StatsResponse<ContratsStats>> {
    const response = await apiClient.get('/contrats/stats', { params });
    return response.data;
  },

  async getContratsExpiring(params?: any): Promise<StatsResponse<ContratsExpiring>> {
    const response = await apiClient.get('/contrats/expiring', { params });
    return response.data;
  },

  async updateContratStatus(id: string, status: Contrat['status']): Promise<DetailResponse<Contrat>> {
    const response = await apiClient.patch(`/contrats/${id}/status`, { status });
    return response.data;
  },

  async getContratAvenants(id: string): Promise<ListResponse<Avenant>> {
    const response = await apiClient.get(`/contrats/${id}/avenants`);
    return response.data;
  },

  // --- INTERACTIONS ---
  async getInteractions(params?: any): Promise<ListResponse<Interaction>> {
    const response = await apiClient.get('/interactions', { params });
    return response.data;
  },

  async createInteraction(data: any): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.post('/interactions', data);
    return response.data;
  },

  async getInteractionsStats(params?: any): Promise<StatsResponse<InteractionsStats>> {
    const response = await apiClient.get('/interactions/stats', { params });
    return response.data;
  },

  async getInteraction(id: string): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.get(`/interactions/${id}`);
    return response.data;
  },

  async linkInteractionTask(id: string, data: any): Promise<DetailResponse<Interaction>> {
    const response = await apiClient.post(`/interactions/${id}/link-task`, data);
    return response.data;
  },

  // --- OPPORTUNITÉS ---
  async getOpportunites(params?: any): Promise<ListResponse<Opportunite>> {
    const response = await apiClient.get('/opportunites', { params });
    return response.data;
  },

  async createOpportunite(data: any): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.post('/opportunites', data);
    return response.data;
  },

  async getOpportunitesPipeline(params?: any): Promise<StatsResponse<OpportunitesPipeline>> {
    const response = await apiClient.get('/opportunites/pipeline', { params });
    return response.data;
  },

  async getOpportunite(id: string): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.get(`/opportunites/${id}`);
    return response.data;
  },

  async updateOpportuniteStage(id: string, data: any): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.patch(`/opportunites/${id}/stage`, data);
    return response.data;
  },

  async closeOpportunite(id: string, data: any): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.patch(`/opportunites/${id}/close`, data);
    return response.data;
  },

  async addOpportuniteProduct(id: string, data: any): Promise<DetailResponse<Opportunite>> {
    const response = await apiClient.post(`/opportunites/${id}/products`, data);
    return response.data;
  },

  // --- DOCUMENTS ---
  async getDocuments(params?: any): Promise<ListResponse<Document>> {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  async getDocument(id: string): Promise<DetailResponse<Document>> {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  async createDocument(data: any): Promise<DetailResponse<Document>> {
    const response = await apiClient.post('/documents', data);
    return response.data;
  },

  async updateDocument(id: string, data: any): Promise<DetailResponse<Document>> {
    const response = await apiClient.put(`/documents/${id}`, data);
    return response.data;
  },

  async updateDocumentValidity(id: string, data: { estValide: boolean; raison?: string }): Promise<DetailResponse<Document>> {
    const response = await apiClient.patch(`/documents/${id}/validity`, data);
    return response.data;
  },

  async deleteDocument(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },

  async getDocumentsExpiring(params?: any): Promise<StatsResponse<DocumentsExpiring>> {
    const response = await apiClient.get('/documents/expiring', { params });
    return response.data;
  },

  // --- ADRESSES ---
  async getAdresses(params?: any): Promise<ListResponse<Address>> {
    const response = await apiClient.get('/adresses', { params });
    return response.data;
  },

  async getAdresse(id: string): Promise<DetailResponse<Address>> {
    const response = await apiClient.get(`/adresses/${id}`);
    return response.data;
  },

  async createAdresse(data: any): Promise<DetailResponse<Address>> {
    const response = await apiClient.post('/adresses', data);
    return response.data;
  },

  async updateAdresse(id: string, data: any): Promise<DetailResponse<Address>> {
    const response = await apiClient.put(`/adresses/${id}`, data);
    return response.data;
  },

  async deleteAdresse(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/adresses/${id}`);
    return response.data;
  },

  async setAdressePrincipal(id: string): Promise<DetailResponse<Address>> {
    const response = await apiClient.patch(`/adresses/${id}/principal`);
    return response.data;
  },

  // --- CONFIGURATION ---
  async getTypeClients(): Promise<ListResponse<TypeClient>> {
    const response = await apiClient.get('/type-clients');
    return response.data;
  },

  async getTypeClient(id: string): Promise<DetailResponse<TypeClient>> {
    const response = await apiClient.get(`/type-clients/${id}`);
    return response.data;
  },

  async createTypeClient(data: any): Promise<DetailResponse<TypeClient>> {
    const response = await apiClient.post('/type-clients', data);
    return response.data;
  },

  async updateTypeClient(id: string, data: any): Promise<DetailResponse<TypeClient>> {
    const response = await apiClient.put(`/type-clients/${id}`, data);
    return response.data;
  },

  async deleteTypeClient(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/type-clients/${id}`);
    return response.data;
  },

  async toggleTypeClient(id: string): Promise<DetailResponse<TypeClient>> {
    const response = await apiClient.patch(`/type-clients/${id}/toggle-active`);
    return response.data;
  },

  async getSecteurs(): Promise<ListResponse<SecteurActivite>> {
    const response = await apiClient.get('/secteurs');
    return response.data;
  },

  async getSecteur(id: string): Promise<DetailResponse<SecteurActivite>> {
    const response = await apiClient.get(`/secteurs/${id}`);
    return response.data;
  },

  async createSecteur(data: any): Promise<DetailResponse<SecteurActivite>> {
    const response = await apiClient.post('/secteurs', data);
    return response.data;
  },

  async updateSecteur(id: string, data: any): Promise<DetailResponse<SecteurActivite>> {
    const response = await apiClient.put(`/secteurs/${id}`, data);
    return response.data;
  },

  async deleteSecteur(id: string): Promise<EmptyResponse> {
    const response = await apiClient.delete(`/secteurs/${id}`);
    return response.data;
  },

  async getSecteursTree(): Promise<ListResponse<SecteurTreeItem>> {
    const response = await apiClient.get('/secteurs/tree');
    return response.data;
  }
};

export default crmService;
