'use client';

import { useMemo, useState } from 'react';
import { List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { accountingAccountTypeLabel, formatAccountingCurrency } from '@/components/accounting/accountingFormat';
import type { AccountingAccount, AccountingFamilyRule } from '@/shared/api/billing';

interface AccountingFamilyAccountPickerProps {
  familyRule: AccountingFamilyRule;
  accounts: AccountingAccount[];
  isSubmitting: boolean;
  onSelect: (accountId: string) => void;
}

export function AccountingFamilyAccountPicker({
  familyRule,
  accounts,
  isSubmitting,
  onSelect,
}: AccountingFamilyAccountPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const attachedAccountIds = useMemo(
    () => new Set(familyRule.rules.map((rule) => rule.accountId)),
    [familyRule.rules]
  );

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (!query) return true;
      return (
        account.code.toLowerCase().includes(query) ||
        account.label.toLowerCase().includes(query) ||
        accountingAccountTypeLabel(account.type).toLowerCase().includes(query)
      );
    });
  }, [accounts, search]);

  return (
    <>
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {familyRule.primaryAccount
                ? `${familyRule.primaryAccount.code} - ${familyRule.primaryAccount.label}`
                : `Aucun compte ${familyRule.label.toLowerCase()} sélectionné`}
            </p>
            <p className="text-sm text-slate-500">
              {familyRule.primaryAccount
                ? `${familyRule.rules.length} compte(s) rattaché(s) à cette famille`
                : 'Choisissez un compte existant dans le Plan comptable'}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={isSubmitting}>
            <List className="mr-2 h-4 w-4" />
            Choisir dans le plan comptable
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{familyRule.label}</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs comptes existants du plan comptable pour rattacher cette famille.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par code, libellé ou type..."
                className="pl-10"
              />
            </div>

            <div className="max-h-[55vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Rattachement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const isAttached = attachedAccountIds.has(account.id);
                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">{account.code}</code>
                        </TableCell>
                        <TableCell className="font-medium">{account.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{accountingAccountTypeLabel(account.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatAccountingCurrency(account.balance)}</TableCell>
                        <TableCell>
                          {isAttached ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                              {familyRule.primaryAccountId === account.id ? 'Principal' : 'Déjà rattaché'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-500">Disponible</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isAttached || isSubmitting}
                            onClick={() => {
                              onSelect(account.id);
                              setOpen(false);
                              setSearch('');
                            }}
                          >
                            Ajouter
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredAccounts.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        Aucun compte ne correspond à votre recherche.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
