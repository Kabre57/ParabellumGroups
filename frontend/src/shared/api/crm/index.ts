import { clientsService } from './clients.service';
import { contactsService } from './contacts.service';
import { contratsService } from './contrats.service';
import { opportunitesService } from './opportunites.service';
import { interactionsService } from './interactions.service';
import { typeClientsService } from './type-clients.service';
import { secteursService } from './secteurs.service';
import { adressesService } from './adresses.service';
import { documentsService } from './documents.service';

export * from './types';

export const crmService = {
  ...clientsService,
  ...contactsService,
  ...contratsService,
  ...opportunitesService,
  ...interactionsService,
  ...typeClientsService,
  ...secteursService,
  ...adressesService,
  ...documentsService,
};

export default crmService;
