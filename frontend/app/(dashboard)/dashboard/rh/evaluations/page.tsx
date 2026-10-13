'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { hrService } from '@/shared/api/hr';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type EvaluationStatus, type EvaluationRow, DEFAULT_FORM, normalizeScore, readCompetence, buildStatus, useEvaluationsPageModel } from './page.model';

export default function EvaluationsPage() {  const { user, queryClient, searchQuery, setSearchQuery, statusFilter, setStatusFilter, openCreate, setOpenCreate, selectedEvaluation, setSelectedEvaluation, form, setForm, canCreate, evaluationsResponse, isLoading, employeesResponse, createMutation, employees, evaluations, filteredEvaluations, averageScore, getStatusBadge, getScoreColor } = useEvaluationsPageModel();



  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Évaluations de Performance</h1>
            <p className="text-muted-foreground mt-2">
              Évaluations annuelles et suivi des performances désormais connectés aux données RH réelles.
            </p>
          </div>
          {canCreate ? (
            <Button className="flex items-center gap-2" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle Évaluation
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total évaluations</p>
                <p className="text-2xl font-bold">{evaluations.length}</p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Note moyenne</p>
                <p className="text-2xl font-bold text-green-600">{averageScore.toFixed(1)}/5</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalisées</p>
                <p className="text-2xl font-bold text-green-600">
                  {evaluations.filter((evaluation) => evaluation.status === 'finalisee').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À compléter</p>
                <p className="text-2xl font-bold text-orange-600">
                  {evaluations.filter((evaluation) => evaluation.status === 'a_completer').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une évaluation..."
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-4 py-2 border rounded-md bg-background"
            >
              <option value="all">Tous les statuts</option>
              <option value="a_completer">À compléter</option>
              <option value="finalisee">Finalisée</option>
            </select>
          </div>
        </Card>

        <Card className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Employé</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Poste</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Période</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Évaluateur</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Globale</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Technique</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Communication</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Équipe</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm">Productivité</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Statut</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvaluations.map((evaluation) => (
                    <tr key={evaluation.id} className="border-b hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-medium">{evaluation.employeeName}</td>
                      <td className="py-3 px-4 text-sm">
                        <div>{evaluation.position}</div>
                        <div className="text-xs text-muted-foreground">{evaluation.department}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{evaluation.period}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{evaluation.evaluatorName}</td>
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
                        <Button size="sm" variant="outline" onClick={() => setSelectedEvaluation(evaluation)}>
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                        Aucune évaluation trouvée.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouvelle évaluation</DialogTitle>
            <DialogDescription>
              Saisissez une évaluation annuelle à partir des employés et évaluateurs réels du référentiel RH.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employé évalué</label>
              <select
                value={form.employeId}
                onChange={(event) => setForm((current) => ({ ...current, employeId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un employé</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Évaluateur</label>
              <select
                value={form.evaluateurId}
                onChange={(event) => setForm((current) => ({ ...current, evaluateurId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner un évaluateur</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date d’évaluation</label>
              <Input
                type="date"
                value={form.dateEvaluation}
                onChange={(event) => setForm((current) => ({ ...current, dateEvaluation: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Input value={form.periode} onChange={(event) => setForm((current) => ({ ...current, periode: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note globale /5</label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.noteGlobale}
                onChange={(event) => setForm((current) => ({ ...current, noteGlobale: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Commentaire</label>
              <Input
                value={form.commentaires}
                onChange={(event) => setForm((current) => ({ ...current, commentaires: event.target.value }))}
                placeholder="Synthèse de l’évaluation"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {[
              ['technique', 'Technique'],
              ['communication', 'Communication'],
              ['teamwork', 'Équipe'],
              ['productivity', 'Productivité'],
              ['initiative', 'Initiative'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.employeId || !form.evaluateurId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Enregistrement...' : 'Créer l’évaluation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEvaluation)} onOpenChange={(open) => !open && setSelectedEvaluation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvaluation?.employeeName}</DialogTitle>
            <DialogDescription>
              Détail de l’évaluation sur la période {selectedEvaluation?.period}.
            </DialogDescription>
          </DialogHeader>
          {selectedEvaluation ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Évaluateur</div>
                  <div className="mt-2 font-medium">{selectedEvaluation.evaluatorName}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Note globale</div>
                  <div className={`mt-2 text-2xl font-semibold ${getScoreColor(selectedEvaluation.overallScore)}`}>
                    {selectedEvaluation.overallScore.toFixed(1)}/5
                  </div>
                </Card>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ['Technique', selectedEvaluation.technical],
                  ['Communication', selectedEvaluation.communication],
                  ['Équipe', selectedEvaluation.teamwork],
                  ['Productivité', selectedEvaluation.productivity],
                  ['Initiative', selectedEvaluation.initiative],
                ].map(([label, value]) => (
                  <Card key={label} className="p-3 text-center">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-2 text-lg font-semibold">{value}/5</div>
                  </Card>
                ))}
              </div>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Commentaires</div>
                <div className="mt-2 whitespace-pre-wrap">{selectedEvaluation.comments || 'Aucun commentaire saisi.'}</div>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
