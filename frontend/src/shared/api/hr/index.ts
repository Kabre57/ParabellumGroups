import { employeesService } from './employees.service';
import { payrollService } from './payroll.service';
import { congesService } from './conges.service';
import { presencesService } from './presences.service';
import { evaluationsService } from './evaluations.service';
import { contractsService } from './contracts.service';

export * from './types';
export * from './employees.service';
export * from './payroll.service';
export * from './conges.service';
export * from './presences.service';
export * from './evaluations.service';
export * from './contracts.service';

export const hrService = {
  ...employeesService,
  ...payrollService,
  ...congesService,
  ...presencesService,
  ...evaluationsService,
  ...contractsService,
};

export default hrService;
