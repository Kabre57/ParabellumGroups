'use client';

import { ChevronRight, Clock3 } from 'lucide-react';
import type { OperationalRequest } from '@/shared/api/operationalRequests.service';
import { formatDate, formatMoney, statusColors, statusLabels, typeLabels } from '../constants';

interface OperationalRequestCardProps {
  request: OperationalRequest;
  typeLabel?: string;
  isSelected: boolean;
  canViewRequester: boolean;
  onSelect: (id: string) => void;
}

export function OperationalRequestCard({
  request,
  typeLabel,
  isSelected,
  canViewRequester,
  onSelect,
}: OperationalRequestCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(request.id)}
      className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {request.requestNumber} · {typeLabel || typeLabels[request.type] || request.type}
          </p>
          <h2 className="mt-1 truncate font-semibold text-slate-950">{request.beneficiaryName}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{request.reason}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[request.status]}`}>
          {statusLabels[request.status]}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-900">
          {formatMoney(request.amountApproved ?? request.amountRequested)}
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          {formatDate(request.createdAt)}
          <ChevronRight className="ml-1 h-4 w-4" />
        </span>
      </div>
      {canViewRequester && (
        <p className="mt-2 text-xs text-slate-500">Demandeur : {request.requesterName}</p>
      )}
    </button>
  );
}
