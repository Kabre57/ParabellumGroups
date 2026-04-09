'use client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAccountingCurrency } from '@/components/accounting/accountingFormat';

interface TresorerieAccountsListProps {
  accounts: any[];
}

export function TresorerieAccountsList({ accounts }: TresorerieAccountsListProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Comptes de trésorerie</h2>
          <p className="text-sm text-muted-foreground">Banque principale, sous-caisses et comptes dédiés.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="p-4 border border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">{account.type === 'BANK' ? 'Banque' : 'Caisse'}</p>
                <p className="text-lg font-semibold">{account.name}</p>
                {account.bankName && <p className="text-xs text-muted-foreground">{account.bankName}</p>}
                {account.accountNumber && <p className="text-xs text-muted-foreground">{account.accountNumber}</p>}
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                {account.isDefault ? 'Par défaut' : 'Actif'}
              </span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">Solde</div>
            <div className="text-xl font-bold">{formatAccountingCurrency(account.balance ?? account.currentBalance ?? 0)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Encaissements: {formatAccountingCurrency(account.inflows || 0)} · Décaissements: {formatAccountingCurrency(account.outflows || 0)}
            </div>
          </Card>
        ))}
        {!accounts.length && (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Aucun compte de trésorerie enregistré.
          </div>
        )}
      </div>
    </Card>
  );
}
