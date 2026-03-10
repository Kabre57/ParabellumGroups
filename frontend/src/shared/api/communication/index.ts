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

export type MessageType = 'EMAIL' | 'SMS' | 'NOTIFICATION';
export type MessageStatus = 'BROUILLON' | 'ENVOYE' | 'LU' | 'ARCHIVE';

export interface CommunicationMessage {
  id: string;
  expediteurId: string;
  destinataireId: string;
  sujet: string;
  contenu: string;
  type: MessageType;
  status: MessageStatus;
  dateEnvoi?: string | null;
  dateLu?: string | null;
  pieceJointe: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const communicationService = {
  async getMessages(params?: {
    expediteurId?: string;
    destinataireId?: string;
    type?: MessageType;
    status?: MessageStatus;
  }): Promise<CommunicationMessage[]> {
    const response = await apiClient.get('/communication/messages', { params });
    return response.data || [];
  },

  async createMessage(data: {
    expediteurId: string;
    destinataireId: string;
    sujet: string;
    contenu: string;
    type: MessageType;
    pieceJointe?: string[];
  }): Promise<CommunicationMessage> {
    const response = await apiClient.post('/communication/messages', {
      ...data,
      pieceJointe: data.pieceJointe || [],
    });
    return response.data;
  },

  async sendMessage(id: string): Promise<CommunicationMessage> {
    const response = await apiClient.post(`/communication/messages/${id}/send`);
    return response.data;
  },

  async markMessageAsRead(id: string): Promise<CommunicationMessage> {
    const response = await apiClient.put(`/communication/messages/${id}/read`);
    return response.data;
  },

  async archiveMessage(id: string): Promise<CommunicationMessage> {
    const response = await apiClient.put(`/communication/messages/${id}/archive`);
    return response.data;
  },

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
