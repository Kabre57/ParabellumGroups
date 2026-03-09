'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Download, Send, Eye, Edit, Copy } from 'lucide-react';

interface Quote {
  id: string;
  number: string;
  title: string;
  customer: string;
  amount: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  createdAt: string;
  createdBy: string;
}

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ['quotes'],
    queryFn: async () => {
      return [
        { id: '1', number: 'DEV-2026-001', title: 'Installation système sécurité', customer: 'Entreprise ABC', amount: 45000, status: 'sent', validUntil: '2026-02-15', createdAt: '2026-01-15', createdBy: 'Jean Dupont' },
        { id: '2', number: 'DEV-2026-002', title: 'Maintenance annuelle', customer: 'Société XYZ', amount: 12000, status: 'accepted', validUntil: '2026-02-01', createdAt: '2026-01-10', createdBy: 'Marie Martin' },
        { id: '3', number: 'DEV-2026-003', title: 'Audit sécurité', customer: 'Tech Corp', amount: 25000, status: 'viewed', validUntil: '2026-03-01', createdAt: '2026-01-20', createdBy: 'Pierre Durant' },
        { id: '4', number: 'DEV-2026-004', title: 'Formation équipe', customer: 'StartupPro', amount: 8000, status: 'draft', validUntil: '2026-03-15', createdAt: '2026-01-21', createdBy: 'Jean Dupont' },
        { id: '5', number: 'DEV-2026-005', title: 'Système alarme', customer: 'Retail Store', amount: 35000, status: 'rejected', validUntil: '2026-01-20', createdAt: '2026-01-05', createdBy: 'Marie Martin' },
      ];
    },
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      sent: { label: 'Envoyé', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      viewed: { label: 'Consulté', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      accepted: { label: 'Accepté', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      rejected: { label: 'Refusé', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      expired: { label: 'Expiré', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    };
    const badge = badges[status] || badges.draft;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quote.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Devis & Propositions</h1>
          <p className="text-muted-foreground mt-2">
            Gestion des devis commerciaux et propositions clients
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Devis
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Devis</p>
              <p className="text-2xl font-bold">{quotes?.length || 0}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Montant Total</p>
              <p className="text-2xl font-bold">
                {quotes?.reduce((sum, q) => sum + q.amount, 0).toLocaleString()}F
              </p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Acceptés</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes?.filter(q => q.status === 'accepted').length || 0}
              </p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux Acceptation</p>
              <p className="text-2xl font-bold">
                {quotes ? Math.round((quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100) : 0}%
              </p>
            </div>
            <FileText className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un devis..."
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="viewed">Consulté</option>
            <option value="accepted">Accepté</option>
            <option value="rejected">Refusé</option>
            <option value="expired">Expiré</option>
          </select>
        </div>
      </Card>

      {/* Quotes Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Numéro</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Titre</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Montant</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Valide jusqu'au</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Créé par</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes?.map((quote) => (
                  <tr key={quote.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                        {quote.number}
                      </code>
                    </td>
                    <td className="py-3 px-4 font-medium">{quote.title}</td>
                    <td className="py-3 px-4">{quote.customer}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {quote.amount.toLocaleString()}F
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(quote.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{quote.createdBy}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" title="Voir">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" title="Modifier">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" title="Dupliquer">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" title="Télécharger">
                          <Download className="h-3 w-3" />
                        </Button>
                        {quote.status === 'draft' && (
                          <Button size="sm" className="bg-blue-600 text-white" title="Envoyer">
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
