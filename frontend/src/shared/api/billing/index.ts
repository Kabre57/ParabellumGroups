import { accountingService } from './accounting.service';
import { invoicesService } from './invoices.service';
import { paymentsService } from './payments.service';
import { placementsService } from './placements.service';
import { quotesService } from './quotes.service';
import { treasuryService } from './treasury.service';
import { investmentsService } from './investments.service';

export * from './types';

export const billingService = {
  ...invoicesService,
  ...quotesService,
  ...paymentsService,
  ...accountingService,
  ...treasuryService,
  ...placementsService,
  ...investmentsService,
};

export default billingService;
