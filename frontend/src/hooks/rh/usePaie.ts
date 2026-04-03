'use client';

import { hrService } from '@/shared/api/hr';
import { useFetch } from './useFetch';

export const usePaie = () => {
  return useFetch(['rh-paie'], () => hrService.getPayrolls({ pageSize: 200 }));
};
