'use client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface TresorerieClosuresTableProps {
  closures: any[];
  canValidate: boolean;
  onValidate: (id: string) => void;
}

export function TresorerieClosuresTable({ closures, canValidate, onValidate }: TresorerieClosuresTableProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Clôtures de caisse</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              {['Période','Compte','Compté','Théorique','Écart','Statut','Action'].map((h, i) => (
                <th key={h} className={`py-3 px-4 font-semibold text-sm ${i >= 2 && i <= 4 ? 'text-right' : i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {closures.map((closure) => (
              <tr key={closure.id} className="border-b dark:border-gray-800">
                <td className="py-3 px-4 text-sm">
                  {new Date(closure.periodStart).toLocaleDateString('fr-FR')} — {new Date(closure.periodEnd).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-3 px-4 text-sm">{closure.treasuryAccountName || 'Toutes caisses'}</td>
                <td className="py-3 px-4 text-right text-sm">{formatAccountingCurrency(closure.countedTotal || 0)}</td>
                <td className="py-3 px-4 text-right text-sm">{formatAccountingCurrency(closure.expectedTotal || 0)}</td>
                <td className="py-3 px-4 text-right text-sm">{formatAccountingCurrency(closure.variance || 0)}</td>
                <td className="py-3 px-4 text-sm">{closure.status}</td>
                <td className="py-3 px-4 text-right">
                  {canValidate && closure.status !== 'VALIDATED'
                    ? <Button size="sm" onClick={() => onValidate(closure.id)}>Valider clôture</Button>
                    : <span className="text-xs text-muted-foreground">-</span>}
                </td>
              </tr>
            ))}
            {!closures.length && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">Aucune clôture enregistrée sur la période.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
