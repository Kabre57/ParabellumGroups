'use client';
import { Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAccountingCurrency, formatAccountingDate, accountingAccountTypeLabel } from '@/components/accounting/accountingFormat';
import type { AccountingAccount } from '@/shared/api/billing';

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  asset: { label: 'Actif', className: 'bg-blue-100 text-blue-800' },
  liability: { label: 'Passif', className: 'bg-red-100 text-red-800' },
  equity: { label: 'Capital', className: 'bg-purple-100 text-purple-800' },
  revenue: { label: 'Produits', className: 'bg-green-100 text-green-800' },
  expense: { label: 'Charges', className: 'bg-orange-100 text-orange-800' },
};

interface ComptesTableProps {
  accounts: AccountingAccount[];
  isLoading: boolean;
  canUpdate: boolean;
  onDetails: (a: AccountingAccount) => void;
  onEdit: (a: AccountingAccount) => void;
}

export function ComptesTable({ accounts, isLoading, canUpdate, onDetails, onEdit }: ComptesTableProps) {
  return (
    <Card className="p-6">
      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                {['Code','Libellé','Type','Solde','Dernière Transaction','Actions'].map(h => (
                  <th key={h} className={`py-3 px-4 font-semibold text-sm ${h === 'Solde' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const badge = TYPE_BADGES[account.type] || TYPE_BADGES.asset;
                return (
                  <tr key={account.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">{account.code}</code>
                    </td>
                    <td className="py-3 px-4 font-medium">{account.label}</td>
                    <td className="py-3 px-4">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      <div className="mt-1 text-xs text-gray-500">{accountingAccountTypeLabel(account.type)}</div>
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAccountingCurrency(account.balance)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatAccountingDate(account.lastTransaction)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onDetails(account)}>Détails</Button>
                        {canUpdate && (
                          <Button size="sm" variant="outline" onClick={() => onEdit(account)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!accounts.length && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-sm text-gray-500">Aucun compte comptable disponible pour ce filtre.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
