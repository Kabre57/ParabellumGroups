export interface StatsResponse<T> {
  success: boolean;
  data: T;
}

export const normalizeListResponse = <T>(payload: any) => {
  if (Array.isArray(payload)) {
    return { success: true, data: payload };
  }

  if (Array.isArray(payload?.data)) {
    return {
      success: payload.success ?? true,
      data: payload.data,
      meta: payload.meta ?? (payload.pagination ? { pagination: payload.pagination } : undefined),
    };
  }

  return {
    success: payload?.success ?? true,
    data: [],
    meta: payload?.meta ?? (payload?.pagination ? { pagination: payload.pagination } : undefined),
  };
};

export const normalizeDetailResponse = <T>(payload: any) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
      message: payload.message,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};

export const normalizeStatsResponse = <T>(payload: any): StatsResponse<T> => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return {
      success: payload.success ?? true,
      data: payload.data as T,
    };
  }

  return {
    success: true,
    data: payload as T,
  };
};
