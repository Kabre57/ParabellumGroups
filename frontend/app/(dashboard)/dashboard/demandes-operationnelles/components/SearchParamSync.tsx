'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function SearchParamSync({ onSelect }: { onSelect: (id: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const paramId = searchParams.get('request') || searchParams.get('id');
    if (paramId) {
      onSelect(paramId);
    }
  }, [searchParams, onSelect]);
  return null;
}
