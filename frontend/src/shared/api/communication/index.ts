import { apiClient } from '../shared/client';

export type CampagneStatus = 'BROUILLON' | 'PROGRAMMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface CampagneTemplate {
  id: string;
  nom: string;
  sujet: string;
  contenu: string;
  type: string;
  variables?: any;
  actif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampagneDestinataire {
  email: string;
  variables?: Record<string, any>;
}

export interface CampagneMail {
  id: string;
  nom: string;
  templateId: string;
  template?: CampagneTemplate;
  destinataires: CampagneDestinataire[];
  dateEnvoi?: string;
  status: CampagneStatus;
  nbEnvoyes: number;
  nbLus: number;
  nbErreurs: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampagneStats {
  nbDestinataires: number;
  nbEnvoyes: number;
  nbLus: number;
  nbErreurs: number;
  tauxEnvoi: number;
  tauxLecture: number;
}

export const communicationService = {
  async getTemplates(): Promise<CampagneTemplate[]> {
    const response = await apiClient.get('/communication/templates');
    return response.data || [];
  },

  async getCampaigns(params?: { status?: CampagneStatus }): Promise<CampagneMail[]> {
    const response = await apiClient.get('/communication/campagnes', { params });
    return response.data || [];
  },

  async getCampaign(id: string): Promise<CampagneMail> {
    const response = await apiClient.get(`/communication/campagnes/${id}`);
    return response.data;
  },

  async createCampaign(data: {
    nom: string;
    templateId: string;
    destinataires: CampagneDestinataire[];
    dateEnvoi?: string;
    status?: CampagneStatus;
  }): Promise<CampagneMail> {
    const response = await apiClient.post('/communication/campagnes', data);
    return response.data;
  },

  async updateCampaign(id: string, data: Partial<CampagneMail>): Promise<CampagneMail> {
    const response = await apiClient.put(`/communication/campagnes/${id}`, data);
    return response.data;
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(`/communication/campagnes/${id}`);
  },

  async scheduleCampaign(id: string, dateEnvoi: string): Promise<CampagneMail> {
    const response = await apiClient.post(`/communication/campagnes/${id}/schedule`, { dateEnvoi });
    return response.data;
  },

  async startCampaign(id: string): Promise<CampagneMail> {
    const response = await apiClient.post(`/communication/campagnes/${id}/start`);
    return response.data;
  },

  async getCampaignStats(id: string): Promise<CampagneStats> {
    const response = await apiClient.get(`/communication/campagnes/${id}/stats`);
    return response.data;
  },
};

export default communicationService;
