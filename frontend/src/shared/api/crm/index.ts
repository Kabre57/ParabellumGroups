import { clientsService } from './clients.service';
import { contactsService } from './contacts.service';
import { contratsService } from './contrats.service';
import { opportunitesService } from './opportunites.service';
import { interactionsService } from './interactions.service';

export * from './types';
export * from './clients.service';
export * from './contacts.service';
export * from './contrats.service';
export * from './opportunites.service';
export * from './interactions.service';

export const crmService = {
  ...clientsService,
  ...contactsService,
  ...contratsService,
  ...opportunitesService,
  ...interactionsService,
};

export default crmService;
