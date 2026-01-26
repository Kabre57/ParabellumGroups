import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, SearchParams, Customer, Address } from '../types';

/**
 * Prospect (extends Customer with additional fields)
 */
export interface Prospect extends Customer {
  prospectStatus?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
  source?: string;
  notes?: string;
  expectedRevenue?: number;
  probability?: number;
  expectedCloseDate?: string;
}

/**
 * Contact associé à un client
 */
export interface CustomerContact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Statistiques des prospects
 */
export interface ProspectStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  averageDealSize: number;
  totalExpectedRevenue: number;
  wonDeals: number;
  lostDeals: number;
}

/**
 * Paramètres de filtrage pour les clients
 */
export interface CustomerParams extends SearchParams {
  isActive?: boolean;
  country?: string;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * Paramètres de filtrage pour les prospects
 */
export interface ProspectParams extends SearchParams {
  status?: string;
  source?: string;
  probabilityMin?: number;
  probabilityMax?: number;
}

/**
 * Données pour créer/mettre à jour un client
 */
export interface CustomerData {
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phoneNumber?: string;
  address?: Address;
  siret?: string;
  vatNumber?: string;
  billingAddress?: Address;
  isActive?: boolean;
}

/**
 * Données pour créer/mettre à jour un prospect
 */
export interface ProspectData extends CustomerData {
  prospectStatus?: string;
  source?: string;
  notes?: string;
  expectedRevenue?: number;
  probability?: number;
  expectedCloseDate?: string;
}

/**
 * Données pour ajouter une adresse à un client
 */
export interface AddressData extends Address {
  type?: 'BILLING' | 'SHIPPING' | 'OTHER';
}

/**
 * Données pour ajouter un contact à un client
 */
export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position?: string;
  isPrimary?: boolean;
}

/**
 * Service API pour la gestion des clients et prospects
 */
export const customersService = {
  /**
   * Récupère la liste des clients avec pagination et filtres
   */
  async getCustomers(params?: CustomerParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    const response = await apiClient.getAxiosInstance().get('/customers', { params });
    return response.data;
  },

  /**
   * Récupère un client par son ID
   */
  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    const response = await apiClient.getAxiosInstance().get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Crée un nouveau client
   */
  async createCustomer(data: CustomerData): Promise<ApiResponse<Customer>> {
    const response = await apiClient.getAxiosInstance().post('/customers', data);
    return response.data;
  },

  /**
   * Met à jour un client existant
   */
  async updateCustomer(id: string, data: Partial<CustomerData>): Promise<ApiResponse<Customer>> {
    const response = await apiClient.getAxiosInstance().patch(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un client
   */
  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.getAxiosInstance().delete(`/customers/${id}`);
    return response.data;
  },

  /**
   * Récupère la liste des prospects avec pagination et filtres
   */
  async getProspects(params?: ProspectParams): Promise<ApiResponse<PaginatedResponse<Prospect>>> {
    const response = await apiClient.getAxiosInstance().get('/prospects', { params });
    return response.data;
  },

  /**
   * Crée un nouveau prospect
   */
  async createProspect(data: ProspectData): Promise<ApiResponse<Prospect>> {
    const response = await apiClient.getAxiosInstance().post('/prospects', data);
    return response.data;
  },

  /**
   * Convertit un prospect en client
   */
  async convertProspect(id: string): Promise<ApiResponse<Customer>> {
    const response = await apiClient.getAxiosInstance().post(`/prospects/${id}/convert`);
    return response.data;
  },

  /**
   * Récupère les statistiques des prospects
   */
  async getProspectStats(): Promise<ApiResponse<ProspectStats>> {
    const response = await apiClient.getAxiosInstance().get('/prospects/stats');
    return response.data;
  },

  /**
   * Ajoute une adresse à un client
   */
  async addCustomerAddress(customerId: string, data: AddressData): Promise<ApiResponse<Address>> {
    const response = await apiClient.getAxiosInstance().post(`/customers/${customerId}/addresses`, data);
    return response.data;
  },

  /**
   * Ajoute un contact à un client
   */
  async addCustomerContact(customerId: string, data: ContactData): Promise<ApiResponse<CustomerContact>> {
    const response = await apiClient.getAxiosInstance().post(`/customers/${customerId}/contacts`, data);
    return response.data;
  },
};

export default customersService;
