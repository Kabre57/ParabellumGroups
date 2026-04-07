'use client';

import { Badge } from '@/components/ui/badge';

const statusStyles: Record<string, { label: string; className: string }> = {
  BROUILLON: { label: 'Brouillon', className: 'bg-slate-100 text-slate-800' },
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  VALIDE: { label: 'Validé', className: 'bg-blue-100 text-blue-800' },
  DECAISSE: { label: 'Décaissé', className: 'bg-emerald-100 text-emerald-800' },
  ANNULE: { label: 'Annulé', className: 'bg-rose-100 text-rose-800' },
  
  // Nouveaux statuts SYSCOHADA Engagements
  ENGAGE: { label: 'Engagé', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  LIQUIDE: { label: 'Liquidé', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  ORDONNANCE: { label: 'Ordonnancé', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  PAYE: { label: 'Payé', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export function CashVoucherStatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || { label: status, className: 'bg-slate-100 text-slate-800' };
  return <Badge className={style.className}>{style.label}</Badge>;
}
