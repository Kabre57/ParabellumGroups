'use client';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

const PERIOD_LABEL: Record<string, string> = { month: 'Ce mois', quarter: 'Ce trimestre', year: 'Cette année' };

interface RapportsResultatProps {
  period: string;
  incomeStatement: any;
  totalReceived: number;
  totalDisbursed: number;
  pendingCommitted: number;
}
export function RapportsResultat({ period, incomeStatement, totalReceived, totalDisbursed, pendingCommitted }: RapportsResultatProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-purple-500" />
        Compte de Résultat ({PERIOD_LABEL[period] ?? period})
      </h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-green-700 mb-2">PRODUITS</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Prestations de services</span>
              <span className="font-semibold text-green-600">{formatAccountingCurrency(incomeStatement?.totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Encaissements clients</span>
              <span className="font-semibold text-green-600">{formatAccountingCurrency(totalReceived)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
              <span className="font-bold">Total Produits</span>
              <span className="font-bold text-green-700">{formatAccountingCurrency(incomeStatement?.totalRevenue || 0)}</span>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-red-700 mb-2">CHARGES</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Bons de caisse et dépenses</span>
              <span className="font-semibold text-red-600">{formatAccountingCurrency(incomeStatement?.totalExpenses || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Engagements d&apos;achat en cours</span>
              <span className="font-semibold text-red-600">{formatAccountingCurrency(pendingCommitted)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Décaissements réalisés</span>
              <span className="font-semibold text-red-600">{formatAccountingCurrency(totalDisbursed)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
              <span className="font-bold">Total Charges</span>
              <span className="font-bold text-red-700">{formatAccountingCurrency(incomeStatement?.totalExpenses || 0)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
          <span className="text-lg font-bold">RÉSULTAT NET</span>
          <span className="text-2xl font-bold text-blue-700">{formatAccountingCurrency(incomeStatement?.netResult || 0)}</span>
        </div>
      </div>
    </Card>
  );
}
