'use client';

import { TrendingUp, TrendingDown, Building2, MoreVertical, History, PieChart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatPercent, typeLabels } from '@/utils/comptabilite/placements/formatters';
import type { Placement } from '@/shared/api/billing';

interface PlacementsTableProps {
  placements: Placement[];
  isLoading: boolean;
  onAddCourse: (placement: Placement) => void;
}

export function PlacementsTable({ placements, isLoading, onAddCourse }: PlacementsTableProps) {
  return (
    <Card className="p-0 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-6 py-4">Placement / Émetteur</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Quantité</th>
              <th className="px-6 py-4 text-right">Prix Moyen</th>
              <th className="px-6 py-4 text-right">Dernier Cours</th>
              <th className="px-6 py-4 text-right">Valorisation</th>
              <th className="px-6 py-4 text-right">Gain / Perte</th>
              <th className="px-6 py-4 text-center">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic">
                  Chargement des placements...
                </td>
              </tr>
            ) : placements.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                  Aucun placement trouvé.
                </td>
              </tr>
            ) : (
              placements.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {p.issuer || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline">{typeLabels[p.type]}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">{p.quantity}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(p.purchasePrice)}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-semibold text-indigo-600">
                    {formatCurrency(p.lastCourse)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums font-bold">
                    {formatCurrency(p.currentValuation)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    <div className={p.gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      <div className="font-bold">{formatCurrency(p.gainLoss)}</div>
                      <div className="text-[10px] flex items-center justify-end">
                        {p.gainLoss >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {formatPercent(p.gainLossPercent)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={p.status === 'ACTIF' ? ('success' as any) : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAddCourse(p)}>
                          <History className="mr-2 h-4 w-4" />
                          Saisie du cours
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <PieChart className="mr-2 h-4 w-4" />
                          Détails &amp; Graphique
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
