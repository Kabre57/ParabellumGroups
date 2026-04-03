import { hrService } from '@/shared/api/hr';

export const paieService = {
  list: (params?: { pageSize?: number }) => hrService.getPayrolls({ pageSize: params?.pageSize ?? 200 }),
};
