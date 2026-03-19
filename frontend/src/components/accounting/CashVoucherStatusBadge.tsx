'use client';

import { Badge } from '@/components/ui/badge';
import type { CashVoucher } from '@/shared/api/billing';

const statusStyles: Record<CashVoucher['status'], { label: string; className: string }> = {
  BROUILLON: { label: 'Brouillon', className: 'bg-slate-100 text-slate-800' },
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  VALIDE: { label: 'Validé', className: 'bg-blue-100 text-blue-800' },
  DECAISSE: { label: 'Décaissé', className: 'bg-emerald-100 text-emerald-800' },
  ANNULE: { label: 'Annulé', className: 'bg-rose-100 text-rose-800' },
};

export function CashVoucherStatusBadge({ status }: { status: CashVoucher['status'] }) {
  const style = statusStyles[status] || statusStyles.BROUILLON;
  return <Badge className={style.className}>{style.label}</Badge>;
}
