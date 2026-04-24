'use client';

import { hrService } from '@/shared/api/hr';
import { useFetch } from './useFetch';

export const usePersonnel = () => {
  return useFetch(['rh-personnel'], () => hrService.getEmployees({ pageSize: 200 }));
};
