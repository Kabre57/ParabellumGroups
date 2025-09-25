// src/components/Modals/Create/CreatePerformanceReviewModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Minus, User, Star, Target, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const performanceService = createCrudService('performance');
const employeeService = createCrudService('employees');

const createPerformanceSchema = z.object({
  employeeId: z.number().min(1, 'Employé requis'),
  reviewerId: z.number().min(1, 'Évaluateur requis'),
  reviewDate: z.string().min(1, 'Date d\'évaluation requise'),
  periodStart: z.string().min(1, 'Début de période requis'),
  periodEnd: z.string().min(1, 'Fin de période requise'),
  type: z.enum(['ANNUAL', 'PROBATION', 'QUARTERLY', 'PROJECT', 'PROMOTION']),
  overallScore: z.number().min(1).max(5),
  strengths: z.string().optional(),
  areasToImprove: z.string().optional(),
  criteria: z.array(z.object({
    criteria: z.string().min(1, 'Critère requis'),
    description: z.string().optional(),
    weight: z.number().min(0).max(1).default(1),
    score: z.number().min(1).max(5),
    comments: z.string().optional()
  })).min(1, 'Au moins un critère requis')
});

type CreatePerformanceFormData = z.infer<typeof createPerformanceSchema>;

interface CreatePerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePerformanceReviewModal: React.FC<CreatePerformanceReviewModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll({ limit: 100 })
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm<CreatePerformanceFormData>({
    resolver: zodResolver(createPerformanceSchema),
    defaultValues: {
      reviewDate: new Date().toISOString().split('T')[0],
      periodStart: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      periodEnd: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      type: 'ANNUAL',
      overallScore: 3,
      criteria: [{
        criteria: '',
        description: '',
        weight: 1,
        score: 3,
        comments: ''
      }]
    }
  });

  const criteria = watch('criteria') || [];
  const overallScore = watch('overallScore');

  const createPerformanceMutation = useMutation({
    mutationFn: (data: CreatePerformanceFormData) => performanceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreatePerformanceFormData) => {
    setIsLoading(true);
    try {
      await createPerformanceMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCriterion = () => {
    setValue('criteria', [...criteria, {
      criteria: '',
      description: '',
      weight: 1,
      score: 3,
      comments: ''
    }]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      setValue('criteria', criteria.filter((_, i) => i !== index));
    }
  };

  const calculateWeightedScore = () => {
    if (!criteria.length) return 0;
    
    const totalWeight = criteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = criteria.reduce((sum, criterion) => 
      sum + (criterion.score || 0) * (criterion.weight || 0), 0);
    
    return weightedSum / totalWeight;
  };

  const updateOverallScore = () => {
    const calculatedScore = calculateWeightedScore();
    setValue('overallScore', parseFloat(calculatedScore.toFixed(1)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Nouvelle Évaluation de Performance
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employé *</label>
              <select
                {...register('employeeId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un employé</option>
                {employees?.data?.employees?.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Évaluateur *</label>
              <select
                {...register('reviewerId', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un évaluateur</option>
                {employees?.data?.employees?.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {errors.reviewerId && <p className="mt-1 text-sm text-red-600">{errors.reviewerId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'évaluation *</label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ANNUAL">Annuelle</option>
                <option value="PROBATION">Période d'essai</option>
                <option value="QUARTERLY">Trimestrielle</option>
                <option value="PROJECT">Projet</option>
                <option value="PROMOTION">Promotion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'évaluation *</label>
              <input
                {...register('reviewDate')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.reviewDate && <p className="mt-1 text-sm text-red-600">{errors.reviewDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début de période *</label>
              <input
                {...register('periodStart')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.periodStart && <p className="mt-1 text-sm text-red-600">{errors.periodStart.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin de période *</label>
              <input
                {...register('periodEnd')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.periodEnd && <p className="mt-1 text-sm text-red-600">{errors.periodEnd.message}</p>}
            </div>
          </div>

          {/* Score global */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Score Global</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setValue('overallScore', star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= overallScore
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-lg font-semibold">
                {overallScore}/5
              </span>
              <button
                type="button"
                onClick={updateOverallScore}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Calculer automatiquement
              </button>
            </div>
          </div>

          {/* Critères d'évaluation */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Critères d'Évaluation</h4>
              <button
                type="button"
                onClick={addCriterion}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter un critère</span>
              </button>
            </div>

            {criteria.map((criterion, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 p-3 border border-gray-200 rounded-lg">
                <div className="md:col-span-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Critère *</label>
                  <input
                    {...register(`criteria.${index}.criteria` as const)}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Qualité du travail"
                  />
                  {errors.criteria?.[index]?.criteria && (
                    <p className="mt-1 text-sm text-red-600">{errors.criteria[index]?.criteria?.message}</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poids (0-1)</label>
                  <input
                    {...register(`criteria.${index}.weight` as const, { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score (1-5)</label>
                  <select
                    {...register(`criteria.${index}.score` as const, { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 - Insatisfaisant</option>
                    <option value={2}>2 - En développement</option>
                    <option value={3}>3 - Satisfaisant</option>
                    <option value={4}>4 - Très bon</option>
                    <option value={5}>5 - Exceptionnel</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                    disabled={criteria.length <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    {...register(`criteria.${index}.description` as const)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Description du critère..."
                  />
                </div>
                <div className="md:col-span-12">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires</label>
                  <textarea
                    {...register(`criteria.${index}.comments` as const)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Commentaires sur ce critère..."
                  />
                </div>
              </div>
            ))}
            {errors.criteria?.root && (
              <p className="mt-1 text-sm text-red-600">{errors.criteria.root.message}</p>
            )}
          </div>

          {/* Points forts et amélioration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points forts</label>
              <textarea
                {...register('strengths')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Points forts de l'employé..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Axes d'amélioration</label>
              <textarea
                {...register('areasToImprove')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Axes d'amélioration..."
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer l\'évaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};