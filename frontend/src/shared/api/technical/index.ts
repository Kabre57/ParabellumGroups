import { techniciensService } from './techniciens.service';
import { missionsService } from './missions.service';
import { interventionsService } from './interventions.service';
import { rapportsService } from './rapports.service';
import { materielService } from './materiel.service';
import { specialitesService } from './specialites.service';

export * from './types';
export * from './techniciens.service';
export * from './missions.service';
export * from './interventions.service';
export * from './rapports.service';
export * from './materiel.service';
export * from './specialites.service';

export const technicalService = {
  ...techniciensService,
  ...missionsService,
  ...interventionsService,
  ...rapportsService,
  ...materielService,
  ...specialitesService,
};

export default technicalService;
