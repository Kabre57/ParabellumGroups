import { crmService } from './crm';
import { commercialService } from './commercial';
import type { Prospect } from '../types';

/**
 * @deprecated Utilisez crmService à la place. 
 * Ce service est maintenu pour la compatibilité ascendante pendant la migration.
 */
export const customersService = {
  getCustomers: async (params?: any) => {
    const response = await crmService.getClients(params);
    // Adapter le format si nécessaire pour les composants existants
    return response;
  },
  getCustomer: (id: string) => crmService.getClient(id),
  createCustomer: (data: any) => crmService.createClient(data),
  updateCustomer: (id: string, data: any) => crmService.updateClient(id, data),
  deleteCustomer: (id: string) => crmService.deleteClient(id),
  getTypeClients: () => crmService.getTypeClients(),
  getSecteurs: () => crmService.getSecteurs(),
  getInteractions: (params: { clientId: string }) => crmService.getInteractions(params),
  // Prospects (commercial service)
  getProspects: (params?: any) => commercialService.getProspects(params),
  getProspect: (id: string) => commercialService.getProspectById(id),
  convertProspect: (id: string, data?: any) => commercialService.convertProspect(id, data),
  getProspectStats: (filters?: any) => commercialService.getStats(filters),
};

export type { Client, Contact, Address, TypeClient, SecteurActivite, Interaction } from './crm';
export type ClientData = Partial<import('./crm').Client>;
export type { Prospect };
export default customersService;
