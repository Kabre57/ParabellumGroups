// Façade publique des appels API du domaine des achats.
import { suppliersMethods } from './procurement/suppliers.service';
import { requestsMethods } from './procurement/requests.service';
import { proformasMethods } from './procurement/proformas.service';
import { ordersMethods } from './procurement/orders.service';
import { inventoryMethods } from './procurement/inventory.service';

export const procurementService = {
  ...suppliersMethods,
  ...requestsMethods,
  ...proformasMethods,
  ...ordersMethods,
  ...inventoryMethods,
};

export type { ListResponse, DetailResponse } from './shared';
export * from './types';
