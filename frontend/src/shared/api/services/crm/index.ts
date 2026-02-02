import { apiClient } from '../../client';
import { ApiResponse, PaginatedResponse, SearchParams } from '../../types';

// ==================== TYPES ====================

export interface Address {
  id?: string;
  clientId: string;
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
}

export interface TypeClient {
  id: string;
  code: string;
  libelle: string;
  couleur?: string;
}

export interface SecteurActivite {
  id: string;
  libelle: string;
  codeNAF?: string;
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

// ==================== SERVICE ====================

export const crmService = {
  // --- CLIENTS ---
  async getClients(params?: any): Promise<ApiResponse<PaginatedResponse<Client>>> {
    const response = await apiClient.get('/clients', { params });
    return response.data;
  },

  async getClient(id: string): Promise<ApiResponse<Client>> {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  async createClient(data: any): Promise<ApiResponse<Client>> {
    const response = await apiClient.post('/clients', data);
    return response.data;
  },

  async updateClient(id: string, data: any): Promise<ApiResponse<Client>> {
    const response = await apiClient.put(`/clients/${id}`, data);
    return response.data;
  },

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/clients/${id}`);
    return response.data;
  },

  // --- CONTACTS ---
  async getContacts(params?: any): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    const response = await apiClient.get('/contacts', { params });
    return response.data;
  },

  async createContact(data: any): Promise<ApiResponse<Contact>> {
    const response = await apiClient.post('/contacts', data);
    return response.data;
  },

  // --- CONTRATS ---
  async getContrats(params?: any): Promise<ApiResponse<PaginatedResponse<Contrat>>> {
    const response = await apiClient.get('/contrats', { params });
    return response.data;
  },

  async getContrat(id: string): Promise<ApiResponse<Contrat>> {
    const response = await apiClient.get(`/contrats/${id}`);
    return response.data;
  },

  async createContrat(data: any): Promise<ApiResponse<Contrat>> {
    const response = await apiClient.post('/contrats', data);
    return response.data;
  },

  // --- INTERACTIONS ---
  async getInteractions(params?: any): Promise<ApiResponse<PaginatedResponse<Interaction>>> {
    const response = await apiClient.get('/interactions', { params });
    return response.data;
  },

  async createInteraction(data: any): Promise<ApiResponse<Interaction>> {
    const response = await apiClient.post('/interactions', data);
    return response.data;
  },

  // --- OPPORTUNITÉS ---
  async getOpportunites(params?: any): Promise<ApiResponse<PaginatedResponse<Opportunite>>> {
    const response = await apiClient.get('/opportunites', { params });
    return response.data;
  },

  async createOpportunite(data: any): Promise<ApiResponse<Opportunite>> {
    const response = await apiClient.post('/opportunites', data);
    return response.data;
  },

  // --- CONFIGURATION ---
  async getTypeClients(): Promise<ApiResponse<TypeClient[]>> {
    const response = await apiClient.get('/type-clients');
    return response.data;
  },

  async getSecteurs(): Promise<ApiResponse<SecteurActivite[]>> {
    const response = await apiClient.get('/secteurs');
    return response.data;
  }
};

export default crmService;
