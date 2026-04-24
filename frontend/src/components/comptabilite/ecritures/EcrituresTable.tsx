'use client';

import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency, formatAccountingDate } from '@/components/accounting/accountingFormat';
import type { AccountingEntry } from '@/shared/api/billing';

interface EcrituresTableProps {
  entries: AccountingEntry[];
  totalDebit: number;
  totalCredit: number;
  isLoading: boolean;
}

export function EcrituresTable({ entries, totalDebit, totalCredit, isLoading }: EcrituresTableProps) {
  return (
    <Card className="p-6">
      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                {[
                  'Date',
                  'Journal',
                  'Entreprise',
                  'Compte Debit',
                  'Compte Credit',
                  'Libelle',
                  'Debit',
                  'Credit',
                  'Reference',
                  'Actions',
                ].map((header) => (
                  <th key={header} className="text-left py-3 px-4 font-semibold text-sm">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4 text-sm">{formatAccountingDate(entry.date)}</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">{entry.journalCode}</Badge>
                    <div className="mt-1 text-xs text-gray-500">{entry.journalLabel}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{entry.enterpriseName || '-'}</td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{entry.accountDebit}</code>
                    <div className="mt-1 text-xs text-gray-500">{entry.accountDebitLabel}</div>
                  </td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">{entry.accountCredit}</code>
                    <div className="mt-1 text-xs text-gray-500">{entry.accountCreditLabel}</div>
                  </td>
                  <td className="py-3 px-4 font-medium max-w-xs truncate">{entry.label}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    {formatAccountingCurrency(entry.debit)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-red-600">
                    {formatAccountingCurrency(entry.credit)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{entry.reference}</td>
                  <td className="py-3 px-4">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!entries.length && (
                <tr>
                  <td colSpan={10} className="py-8 px-4 text-center text-sm text-gray-500">
                    Aucune ecriture comptable disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {entries.length > 0 && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex justify-between items-center font-bold">
                <span className="text-lg">TOTAUX</span>
                <div className="flex gap-8">
                  <div className="text-green-600">Debit: {formatAccountingCurrency(totalDebit)}</div>
                  <div className="text-red-600">Credit: {formatAccountingCurrency(totalCredit)}</div>
                  <div className={totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}>
                    Ecart: {formatAccountingCurrency(Math.abs(totalDebit - totalCredit))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
