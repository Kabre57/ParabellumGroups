import { hrService } from '@/shared/api/hr';

export const personnelService = {
  list: (params?: { pageSize?: number }) => hrService.getEmployees({ pageSize: params?.pageSize ?? 200 }),
};
