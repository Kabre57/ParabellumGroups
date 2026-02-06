import { crmService } from '../crm';
import { commercialService } from '../commercial';

/**
 * @deprecated Utilisez crmService ou commercialService à la place. 
 * Ce service est maintenu pour la compatibilité ascendante.
 */
export const customersService = {
  getCustomers: (params?: any) => crmService.getClients(params),
  getCustomer: (id: string) => crmService.getClient(id),
  createCustomer: (data: any) => crmService.createClient(data),
  updateCustomer: (id: string, data: any) => crmService.updateClient(id, data),
  deleteCustomer: (id: string) => crmService.deleteClient(id),
  
  // Prospects
  getProspects: (params?: any) => commercialService.getProspects(params),
  getProspect: (id: string) => commercialService.getProspectById(id),
};

export default customersService;
