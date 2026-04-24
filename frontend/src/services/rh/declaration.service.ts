import { logipaieService } from '@/shared/api/hr';

export const declarationService = {
  its: (params?: { pageSize?: number }) => logipaieService.getDeclarationsFiscales({ pageSize: params?.pageSize ?? 200 }),
  fdfp: (params?: { pageSize?: number }) => logipaieService.getDeclarationsFiscales({ pageSize: params?.pageSize ?? 200 }),
  cnps: (params?: { pageSize?: number }) => logipaieService.getDeclarationsCnps({ pageSize: params?.pageSize ?? 200 }),
  disa: (params?: { pageSize?: number }) => logipaieService.getDisas({ pageSize: params?.pageSize ?? 200 }),
  dasc: (params?: { pageSize?: number }) => logipaieService.getDascs({ pageSize: params?.pageSize ?? 200 }),
};
