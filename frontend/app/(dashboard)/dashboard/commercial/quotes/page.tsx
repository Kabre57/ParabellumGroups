'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building,
  Clock,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { billingService } from '@/shared/api/billing';

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

interface Quote {
  id: string;
  number: string;
  title: string;
  company: string;
  contact: string;
  amount: number;
  status: QuoteStatus;
  validUntil: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

const quoteStatuses = [
  { id: 'draft' as QuoteStatus, name: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: FileText },
  { id: 'sent' as QuoteStatus, name: 'Envoyé', color: 'bg-blue-100 text-blue-800', icon: Send },
  { id: 'viewed' as QuoteStatus, name: 'Consulté', color: 'bg-purple-100 text-purple-800', icon: Eye },
  { id: 'accepted' as QuoteStatus, name: 'Accepté', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { id: 'rejected' as QuoteStatus, name: 'Refusé', color: 'bg-red-100 text-red-800', icon: XCircle },
  { id: 'expired' as QuoteStatus, name: 'Expiré', color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
];

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: quotesResponse } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => billingService.getQuotes({ limit: 200 }),
  });

  const quotes: Quote[] = useMemo(() => {
    const list = quotesResponse?.data || [];
    return list.map((q) => ({
      id: q.id,
      number: q.numeroDevis || q.id,
      title: q.notes || 'Devis',
      company: q.client?.nom || q.clientId || 'Client',
      contact: (q.client as any)?.contact || '—',
      amount: q.montantTTC ?? q.montantHT ?? 0,
      status: (q.status?.toLowerCase() as QuoteStatus) || 'draft',
      validUntil: q.dateValidite || '',
      sentAt: q.dateDevis || '',
      createdAt: q.createdAt || '',
      updatedAt: q.updatedAt || q.dateDevis || '',
    }));
  }, [quotesResponse]);

  // Filtrage
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchQuery === '' || 
      quote.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || quote.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Statistiques
  const totalValue = filteredQuotes.reduce((sum, q) => sum + q.amount, 0);
  const acceptedValue = filteredQuotes
    .filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + q.amount, 0);
  const pendingValue = filteredQuotes
    .filter(q => ['sent', 'viewed'].includes(q.status))
    .reduce((sum, q) => sum + q.amount, 0);
  const conversionRate = quotes.length > 0
    ? (quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const statusConfig = quoteStatuses.find(s => s.id === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
        <Icon className="w-4 h-4" />
        {statusConfig.name}
      </span>
    );
  };

  const isExpiringSoon = (validUntil: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Gestion des Devis
          </h1>
          <p className="text-gray-600 mt-2">
            Création, suivi et gestion de vos devis commerciaux
          </p>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau devis
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valeur totale</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Devis acceptés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(acceptedValue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(pendingValue)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux de conversion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {conversionRate.toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, titre, entreprise ou contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            {quoteStatuses.map(status => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedStatus === status.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des devis */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-900">Numéro</th>
                <th className="text-left p-4 font-semibold text-gray-900">Titre</th>
                <th className="text-left p-4 font-semibold text-gray-900">Client</th>
                <th className="text-left p-4 font-semibold text-gray-900">Montant</th>
                <th className="text-left p-4 font-semibold text-gray-900">Statut</th>
                <th className="text-left p-4 font-semibold text-gray-900">Validité</th>
                <th className="text-left p-4 font-semibold text-gray-900">Créé le</th>
                <th className="text-right p-4 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuotes.map(quote => (
                <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-sm text-gray-900">{quote.number}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{quote.title}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Building className="w-4 h-4 text-gray-400" />
                        {quote.company}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {quote.contact}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(quote.amount)}
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(quote.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm ${
                        isExpired(quote.validUntil) ? 'text-red-600 font-semibold' :
                        isExpiringSoon(quote.validUntil) ? 'text-orange-600 font-semibold' :
                        'text-gray-900'
                      }`}>
                        {formatDate(quote.validUntil)}
                      </span>
                      {isExpiringSoon(quote.validUntil) && (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      {isExpired(quote.validUntil) && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-600">
                      {formatDate(quote.createdAt)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      <button
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun devis trouvé</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchQuery || selectedStatus !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Créez votre premier devis pour commencer'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
