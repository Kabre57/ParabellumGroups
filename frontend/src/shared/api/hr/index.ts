import { employeesService } from './employees.service';
import { payrollService } from './payroll.service';
import { congesService } from './conges.service';
import { presencesService } from './presences.service';
import { evaluationsService } from './evaluations.service';
import { contractsService } from './contracts.service';
import { loansService } from './loans.service';

export * from './types';

export const hrService = {
  ...employeesService,
  ...payrollService,
  ...congesService,
  ...presencesService,
  ...evaluationsService,
  ...contractsService,
  ...loansService,
};

export default hrService;
