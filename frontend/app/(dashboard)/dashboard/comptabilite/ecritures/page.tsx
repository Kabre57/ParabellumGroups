'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Eye } from 'lucide-react';

interface Entry {
  id: string;
  date: string;
  journalCode: string;
  journalLabel: string;
  accountDebit: string;
  accountCredit: string;
  label: string;
  debit: number;
  credit: number;
  reference: string;
}

export default function EcrituresPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: entries, isLoading } = useQuery<Entry[]>({
    queryKey: ['accounting-entries'],
    queryFn: async () => {
      return [
        { id: '1', date: '2026-01-20', journalCode: 'VT', journalLabel: 'Ventes', accountDebit: '411', accountCredit: '706', label: 'Facture F2026-001 - Entreprise ABC', debit: 45000, credit: 45000, reference: 'F2026-001' },
        { id: '2', date: '2026-01-19', journalCode: 'BQ', journalLabel: 'Banque', accountDebit: '512', accountCredit: '411', label: 'Encaissement Société XYZ', debit: 12000, credit: 12000, reference: 'ENC-001' },
        { id: '3', date: '2026-01-19', journalCode: 'PA', journalLabel: 'Paie', accountDebit: '641', accountCredit: '421', label: 'Salaires janvier 2026', debit: 85000, credit: 85000, reference: 'PAIE-01-2026' },
        { id: '4', date: '2026-01-15', journalCode: 'AC', journalLabel: 'Achats', accountDebit: '607', accountCredit: '401', label: 'Achat matériel TechnoSupply', debit: 8500, credit: 8500, reference: 'FA-8945' },
        { id: '5', date: '2026-01-12', journalCode: 'OD', journalLabel: 'Opérations Diverses', accountDebit: '613', accountCredit: '512', label: 'Loyer bureaux janvier', debit: 4200, credit: 4200, reference: 'LOYER-01' },
      ];
    },
  });

  const filteredEntries = entries?.filter(entry =>
    entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Écritures Comptables</h1>
          <p className="text-muted-foreground mt-2">
            Journal général et écritures comptables
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Écriture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Écritures</p>
              <p className="text-2xl font-bold">{entries?.length || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Débit</p>
              <p className="text-2xl font-bold text-green-600">
                {entries?.reduce((sum, e) => sum + e.debit, 0).toLocaleString()}F
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Crédit</p>
              <p className="text-2xl font-bold text-red-600">
                {entries?.reduce((sum, e) => sum + e.credit, 0).toLocaleString()}F
              </p>
            </div>
            <FileText className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une écriture..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Entries Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Journal</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Compte Débit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Compte Crédit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Libellé</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Débit</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Crédit</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Référence</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries?.map((entry) => (
                  <tr key={entry.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm">{new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {entry.journalCode}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                        {entry.accountDebit}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-xs">
                        {entry.accountCredit}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-xs truncate">{entry.label}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {entry.debit.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {entry.credit.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{entry.reference}</td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals Row */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex justify-between items-center font-bold">
                <span className="text-lg">TOTAUX</span>
                <div className="flex gap-8">
                  <div className="text-green-600">
                    Débit: {entries?.reduce((sum, e) => sum + e.debit, 0).toLocaleString()}F
                  </div>
                  <div className="text-red-600">
                    Crédit: {entries?.reduce((sum, e) => sum + e.credit, 0).toLocaleString()}F
                  </div>
                  <div className={entries?.reduce((sum, e) => sum + e.debit, 0) === entries?.reduce((sum, e) => sum + e.credit, 0) ? 'text-green-600' : 'text-red-600'}>
                    Écart: 0F
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
