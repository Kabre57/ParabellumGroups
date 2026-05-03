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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import { Badge } from '@/components/ui/badge';

interface LedgerLine {
  lineId: string;
  date: string;
  journal: string;
  entryNumber: string;
  label: string;
  reference: string;
  thirdPartyName?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerAccount {
  accountId: string;
  accountCode: string;
  accountLabel: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  lines: LedgerLine[];
}

interface GeneralLedgerTableProps {
  accounts: LedgerAccount[];
  loading?: boolean;
}

export const GeneralLedgerTable: React.FC<GeneralLedgerTableProps> = ({ accounts, loading }) => {
  return (
    <div className="space-y-8">
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">Chargement du Grand Livre...</CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">Aucune donnée trouvée.</CardContent>
        </Card>
      ) : (
        accounts.map((account) => (
          <Card key={account.accountId} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {account.accountCode} - {account.accountLabel}
                </CardTitle>
                <div className="flex gap-4 text-sm">
                  <span>Ouv: <span className="font-bold">{formatCurrency(account.openingBalance)}</span></span>
                  <span>Solde: <span className="font-bold">{formatCurrency(account.currentBalance)}</span></span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[80px]">Jnl</TableHead>
                    <TableHead className="w-[120px]">N° Pièce</TableHead>
                    <TableHead>Libellé / Tiers</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead className="text-right">Solde Progr.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {account.lines.map((line) => (
                    <TableRow key={line.lineId}>
                      <TableCell className="text-xs">{formatDate(line.date)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{line.journal}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{line.entryNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{line.label}</span>
                          {line.thirdPartyName && (
                            <span className="text-xs text-muted-foreground italic">Tiers: {line.thirdPartyName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {line.debit > 0 ? formatCurrency(line.debit) : ''}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {line.credit > 0 ? formatCurrency(line.credit) : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/10 font-semibold text-sm">
                    <TableCell colSpan={4} className="text-right uppercase">Sous-Total {account.accountCode}</TableCell>
                    <TableCell className="text-right text-green-700">{formatCurrency(account.totalDebit)}</TableCell>
                    <TableCell className="text-right text-red-700">{formatCurrency(account.totalCredit)}</TableCell>
                    <TableCell className="text-right underline">{formatCurrency(account.currentBalance)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default GeneralLedgerTable;
