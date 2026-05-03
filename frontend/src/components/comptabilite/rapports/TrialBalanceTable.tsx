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
import { formatCurrency } from '@/shared/utils/format';

interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountLabel: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
}

interface TrialBalanceTableProps {
  data: TrialBalanceRow[];
  loading?: boolean;
}

export const TrialBalanceTable: React.FC<TrialBalanceTableProps> = ({ data, loading }) => {
  const totals = data.reduce(
    (acc, row) => ({
      debit: acc.debit + row.debit,
      credit: acc.credit + row.credit,
    }),
    { debit: 0, credit: 0 }
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Balance Générale</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">Compte</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead className="text-right">Solde Ouv.</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead className="text-right">Solde Clôt.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Aucune donnée trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.map((row) => (
                    <TableRow key={row.accountId}>
                      <TableCell className="font-medium">{row.accountCode}</TableCell>
                      <TableCell>{row.accountLabel}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.closingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={3}>TOTAUX</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.debit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.credit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.debit - totals.credit)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialBalanceTable;
