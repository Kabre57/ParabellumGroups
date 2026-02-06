import { projectsService } from './projects.service';
import { tachesService } from './taches.service';
import { jalonsService } from './jalons.service';

export * from './types';
export * from './projects.service';
export * from './taches.service';
export * from './jalons.service';

export { projectsService };
export const projectService = projectsService;

export default projectsService;
