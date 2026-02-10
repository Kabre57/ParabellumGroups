'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
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
  ChevronRight,
  BarChart3,
  Target,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { opportunitesService } from '@/shared/api/crm/opportunites.service';
import { Opportunite } from '@/shared/api/crm/types';

type PipelineStage = 'prospect' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface PipelineOpportunity {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  stage: PipelineStage;
  expectedCloseDate: string;
  lastActivity: string;
  createdAt: string;
}

const pipelineStages = [
  { id: 'prospect' as PipelineStage, name: 'Prospect', color: 'bg-gray-100 text-gray-800', probability: 10 },
  { id: 'qualification' as PipelineStage, name: 'Qualification', color: 'bg-blue-100 text-blue-800', probability: 25 },
  { id: 'proposal' as PipelineStage, name: 'Proposition', color: 'bg-yellow-100 text-yellow-800', probability: 50 },
  { id: 'negotiation' as PipelineStage, name: 'Négociation', color: 'bg-orange-100 text-orange-800', probability: 75 },
  { id: 'won' as PipelineStage, name: 'Gagné', color: 'bg-green-100 text-green-800', probability: 100 },
  { id: 'lost' as PipelineStage, name: 'Perdu', color: 'bg-red-100 text-red-800', probability: 0 }
];

export default function PipelinePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: opportunitiesResponse } = useQuery({
    queryKey: ['opportunites'],
    queryFn: () => opportunitesService.getOpportunites({ limit: 200 }),
  });

  const opportunities: PipelineOpportunity[] = useMemo(() => {
    const list = opportunitiesResponse?.data || (opportunitiesResponse as any)?.data?.data || [];
    return list.map((opp: Opportunite) => {
      const stageMap: Record<string, PipelineStage> = {
        PROSPECTION: 'prospect',
        QUALIFICATION: 'qualification',
        PROPOSITION: 'proposal',
        NEGOCIATION: 'negotiation',
        FINALISATION: 'negotiation',
      };
      const statusStage: Record<string, PipelineStage> = {
        GAGNEE: 'won',
        PERDUE: 'lost',
      };
      const stage = statusStage[opp.statut] || stageMap[opp.etape] || 'prospect';
      const updatedAt = (opp as any).updatedAt;
      const createdAt = (opp as any).createdAt;
      return {
        id: opp.id,
        title: opp.nom,
        company: opp.client?.nom || 'Client',
        contact: (opp as any).contact || '—',
        value: opp.montantEstime,
        probability: opp.probabilite || 0,
        stage,
        expectedCloseDate: opp.dateFermetureEstimee || updatedAt || createdAt || new Date().toISOString(),
        lastActivity: updatedAt || createdAt,
        createdAt: createdAt || '',
      };
    });
  }, [opportunitiesResponse]);

  // Filtrage
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = searchQuery === '' || 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = selectedStage === 'all' || opp.stage === selectedStage;
    
    return matchesSearch && matchesStage;
  });

  // Statistiques
  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = filteredOpportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);
  const averageProbability = filteredOpportunities.length > 0
    ? filteredOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / filteredOpportunities.length
    : 0;

  // Grouper par étape
  const opportunitiesByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredOpportunities.filter(opp => opp.stage === stage.id);
    return acc;
  }, {} as Record<PipelineStage, PipelineOpportunity[]>);

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

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Pipeline Commercial
          </h1>
          <p className="text-gray-600 mt-2">
            Suivi des opportunités et prévisions de vente
          </p>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle opportunité
        </button>
      </div>

      {/* Statistiques globales */}
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
              <p className="text-sm text-gray-600">Valeur pondérée</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(weightedValue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Opportunités</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {filteredOpportunities.length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taux de réussite moyen</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {averageProbability.toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
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
              placeholder="Rechercher par titre, entreprise ou contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStage('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStage === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            {pipelineStages.filter(s => s.id !== 'lost').map(stage => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStage === stage.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vue Kanban du pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {pipelineStages.filter(s => s.id !== 'lost').map(stage => {
          const stageOpps = opportunitiesByStage[stage.id] || [];
          const stageValue = stageOpps.reduce((sum, opp) => sum + opp.value, 0);

          return (
            <div key={stage.id} className="bg-gray-50 rounded-lg p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                    {stageOpps.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {formatCurrency(stageValue)}
                </p>
              </div>

              <div className="space-y-3">
                {stageOpps.map(opp => (
                  <div
                    key={opp.id}
                    className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{opp.title}</h4>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Building className="w-3 h-3" />
                        <span>{opp.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="w-3 h-3" />
                        <span>{opp.contact}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(opp.value)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        opp.probability >= 75 ? 'bg-green-100 text-green-700' :
                        opp.probability >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {opp.probability}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(opp.expectedCloseDate)}</span>
                    </div>
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Aucune opportunité
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Liste des opportunités perdues */}
      {opportunitiesByStage['lost']?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Opportunités perdues ({opportunitiesByStage['lost'].length})
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {opportunitiesByStage['lost'].map(opp => (
              <div key={opp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{opp.title}</h4>
                  <p className="text-sm text-gray-600">{opp.company} - {opp.contact}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(opp.value)}</p>
                  <p className="text-xs text-gray-500">Perdu le {formatDate(opp.lastActivity)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
