'use client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';
import { formatAccountingDate } from '@/components/accounting/accountingFormat';
import type { AccountingMovement } from '@/shared/api/billing';

interface TresorerieFlowsTableProps {
  flows: AccountingMovement[];
  isLoading: boolean;
}

export function TresorerieFlowsTable({ flows, isLoading }: TresorerieFlowsTableProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Mouvements de Trésorerie</h2>
      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                {['Date','Type','Catégorie','Compte','Description','Montant','Solde'].map((h, i) => (
                  <th key={h} className={`py-3 px-4 font-semibold text-sm ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flows.map((flow) => (
                <tr key={flow.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-sm">{formatAccountingDate(flow.date)}</td>
                  <td className="py-3 px-4">
                    {flow.type === 'income'
                      ? <span className="flex items-center gap-1 text-green-600"><TrendingUp className="h-4 w-4" />Encaissement</span>
                      : <span className="flex items-center gap-1 text-red-600"><TrendingDown className="h-4 w-4" />Décaissement</span>}
                  </td>
                  <td className="py-3 px-4 text-sm">{flow.category}</td>
                  <td className="py-3 px-4 text-sm">{flow.treasuryAccountName || '-'}</td>
                  <td className="py-3 px-4 text-sm">{flow.description}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${flow.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {flow.type === 'income' ? '+' : '-'}{formatAccountingCurrency(flow.amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">{formatAccountingCurrency(flow.balance)}</td>
                </tr>
              ))}
              {!flows.length && (
                <tr><td colSpan={7} className="py-8 px-4 text-center text-sm text-gray-500">Aucun mouvement de trésorerie sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
