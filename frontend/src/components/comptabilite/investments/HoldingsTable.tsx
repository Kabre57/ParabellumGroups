'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { InvestmentHolding } from '@/shared/api/billing/types';

interface HoldingsTableProps {
  holdings: InvestmentHolding[];
  loading?: boolean;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, loading }) => {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Actif</TableHead>
            <TableHead>Type / Classe</TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead className="text-right">Coût Moyen</TableHead>
            <TableHead className="text-right">V. Comptable</TableHead>
            <TableHead className="text-right">V. Marché</TableHead>
            <TableHead className="text-right">P/L Latente</TableHead>
            <TableHead className="text-center">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">Chargement des positions...</TableCell>
            </TableRow>
          ) : holdings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">Aucune position ouverte.</TableCell>
            </TableRow>
          ) : (
            holdings.map((h) => {
              const mktValue = h.marketValue || h.bookValue;
              const pl = mktValue - h.bookValue;
              const plPercent = h.bookValue > 0 ? (pl / h.bookValue) * 100 : 0;

              return (
                <TableRow key={h.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{h.asset?.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{h.asset?.assetCode} | {h.asset?.isin}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[10px] w-fit">{h.asset?.assetType}</Badge>
                      <span className="text-[10px] text-muted-foreground uppercase">{h.asset?.assetClass}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{h.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{formatCurrency(h.averageCost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(h.bookValue)}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-indigo-700">
                    {formatCurrency(mktValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex flex-col items-end ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span className="font-bold text-xs">{formatCurrency(pl)}</span>
                      <span className="text-[10px] flex items-center gap-1">
                        {pl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {plPercent.toFixed(2)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={h.status === 'OPEN' ? 'success' : 'secondary'} className="text-[10px]">
                      {h.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
