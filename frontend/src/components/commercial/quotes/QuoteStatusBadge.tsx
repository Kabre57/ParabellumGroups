'use client';

import { Badge } from '@/components/ui/badge';
import { getQuoteStatusMeta } from './quote-status';

interface Props {
  status?: string;
}

export function QuoteStatusBadge({ status }: Props) {
  const meta = getQuoteStatusMeta(status);

  return <Badge className={`border ${meta.className}`}>{meta.label}</Badge>;
}
