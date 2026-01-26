'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, Search, Star, TrendingUp } from 'lucide-react';

interface Evaluation {
  id: string;
  employee: string;
  position: string;
  period: string;
  evaluator: string;
  overallScore: number;
  technical: number;
  communication: number;
  teamwork: number;
  productivity: number;
  initiative: number;
  status: 'draft' | 'completed' | 'validated';
  date: string;
  comments?: string;
}

export default function EvaluationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: ['evaluations'],
    queryFn: async () => {
      return [
        { id: '1', employee: 'Jean Dupont', position: 'Technicien Chef', period: '2025', evaluator: 'Directeur Technique', overallScore: 4.5, technical: 5, communication: 4, teamwork: 5, productivity: 4, initiative: 4, status: 'validated', date: '2025-12-15', comments: 'Excellent travail technique' },
        { id: '2', employee: 'Marie Martin', position: 'Commerciale Senior', period: '2025', evaluator: 'Directeur Commercial', overallScore: 4.2, technical: 4, communication: 5, teamwork: 4, productivity: 5, initiative: 3, status: 'validated', date: '2025-12-18', comments: 'Très bons résultats commerciaux' },
        { id: '3', employee: 'Pierre Durant', position: 'Technicien', period: '2025', evaluator: 'Jean Dupont', overallScore: 3.8, technical: 4, communication: 3, teamwork: 4, productivity: 4, initiative: 4, status: 'completed', date: '2025-12-20' },
        { id: '4', employee: 'Sophie Lambert', position: 'Assistante RH', period: '2025', evaluator: 'Directeur RH', overallScore: 0, technical: 0, communication: 0, teamwork: 0, productivity: 0, initiative: 0, status: 'draft', date: '2026-01-10' },
      ];
    },
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      completed: { label: 'Complétée', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      validated: { label: 'Validée', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    };
    const badge = badges[status] || badges.draft;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredEvaluations = evaluations?.filter(evaluation => {
    const matchesSearch = evaluation.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         evaluation.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Évaluations de Performance</h1>
          <p className="text-muted-foreground mt-2">
            Évaluations annuelles et suivi des performances
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Évaluation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Évaluations</p>
              <p className="text-2xl font-bold">{evaluations?.length || 0}</p>
            </div>
            <Award className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Note Moyenne</p>
              <p className="text-2xl font-bold text-green-600">
                {evaluations?.filter(e => e.overallScore > 0).reduce((sum, e) => sum + e.overallScore, 0) / 
                 evaluations?.filter(e => e.overallScore > 0).length || 0}/5
              </p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Validées</p>
              <p className="text-2xl font-bold text-green-600">
                {evaluations?.filter(e => e.status === 'validated').length || 0}
              </p>
            </div>
            <Award className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">En Attente</p>
              <p className="text-2xl font-bold text-orange-600">
                {evaluations?.filter(e => e.status === 'draft' || e.status === 'completed').length || 0}
              </p>
            </div>
            <Award className="h-8 w-8 text-orange-500" />
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
              placeholder="Rechercher une évaluation..."
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
            <option value="completed">Complétée</option>
            <option value="validated">Validée</option>
          </select>
        </div>
      </Card>

      {/* Evaluations Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Poste</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Période</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Évaluateur</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Note Globale</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Technique</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Communication</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Équipe</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Productivité</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluations?.map((evaluation) => (
                  <tr key={evaluation.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">{evaluation.employee}</td>
                    <td className="py-3 px-4 text-sm">{evaluation.position}</td>
                    <td className="py-3 px-4 text-sm">{evaluation.period}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{evaluation.evaluator}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className={`h-4 w-4 ${evaluation.overallScore > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        <span className={`font-bold ${getScoreColor(evaluation.overallScore)}`}>
                          {evaluation.overallScore > 0 ? evaluation.overallScore.toFixed(1) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">{evaluation.technical || '-'}/5</td>
                    <td className="py-3 px-4 text-center text-sm">{evaluation.communication || '-'}/5</td>
                    <td className="py-3 px-4 text-center text-sm">{evaluation.teamwork || '-'}/5</td>
                    <td className="py-3 px-4 text-center text-sm">{evaluation.productivity || '-'}/5</td>
                    <td className="py-3 px-4">{getStatusBadge(evaluation.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Voir</Button>
                        {evaluation.status !== 'validated' && (
                          <Button size="sm" variant="outline">Modifier</Button>
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
