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

// État, chargement et actions du parcours d'interface.


export type EvaluationStatus = 'a_completer' | 'finalisee';



export type EvaluationRow = {
  id: string;
  employeeName: string;
  position: string;
  department: string;
  period: string;
  evaluatorName: string;
  overallScore: number;
  technical: number;
  communication: number;
  teamwork: number;
  productivity: number;
  initiative: number;
  status: EvaluationStatus;
  date: string;
  comments?: string;
};



export const DEFAULT_FORM = {
  employeId: '',
  evaluateurId: '',
  dateEvaluation: new Date().toISOString().slice(0, 10),
  periode: String(new Date().getFullYear()),
  noteGlobale: '3.5',
  commentaires: '',
  technique: '3',
  communication: '3',
  teamwork: '3',
  productivity: '3',
  initiative: '3',
};



export const normalizeScore = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};



export const readCompetence = (competences: any, keys: string[]) => {
  if (!competences) return 0;

  if (Array.isArray(competences)) {
    const found = competences.find((item) =>
      keys.some((key) => String(item?.nom || '').toLowerCase().includes(key))
    );
    return normalizeScore(found?.note);
  }

  if (typeof competences === 'object') {
    for (const key of keys) {
      const exact = competences[key];
      if (typeof exact === 'object' && exact !== null) {
        return normalizeScore(exact.note);
      }
      if (exact !== undefined) {
        return normalizeScore(exact);
      }
    }
  }

  return 0;
};



export const buildStatus = (overallScore: number): EvaluationStatus => (overallScore > 0 ? 'finalisee' : 'a_completer');

export function useEvaluationsPageModel() {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationRow | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const { canCreate } = getCrudVisibility(user, {
    read: ['evaluations.read', 'evaluations.read_all', 'evaluations.read_own', 'evaluations.read_team'],
    create: ['evaluations.create'],
  });

  const { data: evaluationsResponse, isLoading } = useQuery({
    queryKey: ['hr-evaluations'],
    queryFn: () => hrService.getEvaluations({ limit: 200 }),
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ['hr-evaluation-employees'],
    queryFn: () => hrService.getEmployees({ pageSize: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      hrService.createEvaluation({
        employeId: form.employeId,
        evaluateurId: form.evaluateurId,
        dateEvaluation: form.dateEvaluation,
        periode: form.periode,
        noteGlobale: Number(form.noteGlobale || 0),
        competences: {
          technique: Number(form.technique || 0),
          communication: Number(form.communication || 0),
          teamwork: Number(form.teamwork || 0),
          productivity: Number(form.productivity || 0),
          initiative: Number(form.initiative || 0),
        },
        commentaires: form.commentaires,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-evaluations'] });
      toast.success("Évaluation enregistrée");
      setOpenCreate(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error("Impossible d'enregistrer l'évaluation"),
  });

  const employees = employeesResponse?.data ?? [];

  const evaluations = useMemo<EvaluationRow[]>(() => {
    const rows = evaluationsResponse?.data ?? [];

    return rows.map((evaluation: any) => {
      const overallScore = normalizeScore(evaluation.noteGlobale);
      return {
        id: evaluation.id,
        employeeName: `${evaluation.employe?.prenom || ''} ${evaluation.employe?.nom || ''}`.trim() || 'Employé inconnu',
        position: evaluation.employe?.poste || '-',
        department: evaluation.employe?.departement || '-',
        period: evaluation.periode || '-',
        evaluatorName: `${evaluation.evaluateur?.prenom || ''} ${evaluation.evaluateur?.nom || ''}`.trim() || 'Non renseigné',
        overallScore,
        technical: readCompetence(evaluation.competences, ['technique', 'technical']),
        communication: readCompetence(evaluation.competences, ['communication']),
        teamwork: readCompetence(evaluation.competences, ['teamwork', 'equipe', 'équipe']),
        productivity: readCompetence(evaluation.competences, ['productivity', 'productivite', 'productivité']),
        initiative: readCompetence(evaluation.competences, ['initiative']),
        status: buildStatus(overallScore),
        date: evaluation.dateEvaluation,
        comments: evaluation.commentaires || evaluation.pointsForts || undefined,
      };
    });
  }, [evaluationsResponse?.data]);

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const matchesSearch =
      evaluation.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const averageScore =
    evaluations.filter((evaluation) => evaluation.overallScore > 0).reduce((sum, evaluation) => sum + evaluation.overallScore, 0) /
      Math.max(
        1,
        evaluations.filter((evaluation) => evaluation.overallScore > 0).length
      );

  const getStatusBadge = (status: EvaluationStatus) => {
    if (status === 'finalisee') {
      return <Badge className="bg-green-100 text-green-800">Finalisée</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800">À compléter</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };
  return {
    user,
    queryClient,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    openCreate,
    setOpenCreate,
    selectedEvaluation,
    setSelectedEvaluation,
    form,
    setForm,
    canCreate,
    evaluationsResponse,
    isLoading,
    employeesResponse,
    createMutation,
    employees,
    evaluations,
    filteredEvaluations,
    averageScore,
    getStatusBadge,
    getScoreColor,
  };
}
