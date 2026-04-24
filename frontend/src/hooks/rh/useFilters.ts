'use client';

import { useMemo, useState } from 'react';
import { RhFilterConfig } from '@/types/rh';

export const useFilters = (filters: RhFilterConfig[]) => {
  const [values, setValues] = useState<Record<string, string | number>>({});

  const setFilter = (key: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const activeFilters = useMemo(
    () =>
      Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== '')
        .reduce<Record<string, string | number>>((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {}),
    [values]
  );

  return { filters, values, activeFilters, setFilter };
};
