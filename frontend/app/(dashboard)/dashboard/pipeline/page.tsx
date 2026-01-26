'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Workflow, Plus, Search, ChevronRight, TrendingUp, DollarSign, Clock, Users } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  customer: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
}

export default function PipelinePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: deals, isLoading } = useQuery<Deal[]>({
    queryKey: ['pipeline-deals'],
    queryFn: async () => {
      return [
        { id: '1', title: 'Installation système sécurité', customer: 'Entreprise ABC', value: 45000, stage: 'proposal', probability: 60, expectedCloseDate: '2026-02-15', assignedTo: 'Jean Dupont' },
        { id: '2', title: 'Maintenance annuelle', customer: 'SociétéXYZ', value: 12000, stage: 'negotiation', probability: 80, expectedCloseDate: '2026-02-01', assignedTo: 'Marie Martin' },
        { id: '3', title: 'Audit sécurité complet', customer: 'Tech Corp', value: 25000, stage: 'qualified', probability: 40, expectedCloseDate: '2026-03-01', assignedTo: 'Pierre Durant' },
        { id: '4', title: 'Formation équipe', customer: 'StartupPro', value: 8000, stage: 'lead', probability: 20, expectedCloseDate: '2026-03-15', assignedTo: 'Jean Dupont' },
        { id: '5', title: 'Système alarme incendie', customer: 'Retail Store', value: 35000, stage: 'proposal', probability: 50, expectedCloseDate: '2026-02-20', assignedTo: 'Marie Martin' },
      ];
    },
  });

  const stages = [
    { id: 'lead', name: 'Prospect', color: 'bg-gray-100 dark:bg-gray-800' },
    { id: 'qualified', name: 'Qualifié', color: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'proposal', name: 'Proposition', color: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: 'negotiation', name: 'Négociation', color: 'bg-orange-100 dark:bg-orange-900/30' },
    { id: 'closed_won', name: 'Gagné', color: 'bg-green-100 dark:bg-green-900/30' },
    { id: 'closed_lost', name: 'Perdu', color: 'bg-red-100 dark:bg-red-900/30' },
  ];

  const getDealsByStage = (stageId: string) => {
    return deals?.filter(deal => deal.stage === stageId) || [];
  };

  const getTotalValue = (stageId: string) => {
    const stageDeals = getDealsByStage(stageId);
    return stageDeals.reduce((sum, deal) => sum + deal.value, 0);
  };

  const filteredDeals = deals?.filter(deal =>
    deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Commercial</h1>
          <p className="text-muted-foreground mt-2">
            Suivi des opportunités et cycle de vente
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Opportunité
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Pipeline</p>
              <p className="text-2xl font-bold">
                {deals?.reduce((sum, d) => sum + d.value, 0).toLocaleString()}F
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Opportunités</p>
              <p className="text-2xl font-bold">{deals?.length || 0}</p>
            </div>
            <Workflow className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux Conversion</p>
              <p className="text-2xl font-bold">68%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cycle Vente Moyen</p>
              <p className="text-2xl font-bold">24j</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
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
            placeholder="Rechercher une opportunité..."
            className="pl-10"
          />
        </div>
      </Card>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            const totalValue = getTotalValue(stage.id);

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <Card className="h-full">
                  <div className={`p-4 ${stage.color} border-b`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{stage.name}</h3>
                      <Badge className="bg-white dark:bg-gray-800">{stageDeals.length}</Badge>
                    </div>
                    <p className="text-sm font-medium">{totalValue.toLocaleString()}F</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                    {stageDeals.map((deal) => (
                      <Card key={deal.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">{deal.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{deal.customer}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{deal.value.toLocaleString()}F</span>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                              {deal.probability}%
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(deal.expectedCloseDate).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Users className="h-3 w-3 mr-1" />
                            {deal.assignedTo}
                          </div>
                        </div>
                      </Card>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Aucune opportunité
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
