// src/pages/Performance/PerformanceManagement.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Filter, User, Star, Target, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreatePerformanceReviewModal } from '../../components/Modals/Create/CreatePerformanceReviewModal';
import { ViewPerformanceReviewModal } from '../../components/Modals/View/ViewPerformanceReviewModal';

const performanceService = createCrudService('performance');
const employeeService = createCrudService('employees');

const reviewTypeLabels = {
  ANNUAL: 'Annuelle',
  PROBATION: 'Période d\'essai',
  QUARTERLY: 'Trimestrielle',
  PROJECT: 'Projet',
  PROMOTION: 'Promotion'
};

const ratingLabels = {
  1: 'Insatisfaisant',
  2: 'En développement',
  3: 'Satisfaisant',
  4: 'Très bon',
  5: 'Exceptionnel'
};

export const PerformanceManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  const { data: reviewsData, isLoading, error } = useQuery({
    queryKey: ['performance-reviews', page, search, typeFilter, employeeFilter],
    queryFn: () => performanceService.getAll({ 
      page, 
      limit: 10, 
      search, 
      type: typeFilter,
      employeeId: employeeFilter 
    })
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll({ limit: 100 })
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Erreur lors du chargement des évaluations
      </div>
    );
  }

  const reviews = reviewsData?.data?.reviews || [];
  const pagination = reviewsData?.data?.pagination;
  const employees = employeesData?.data?.employees || [];

  const handleViewReview = (review: any) => {
    setSelectedReview(review);
    setShowViewModal(true);
  };

  const handleCloseModals = () => {
    setShowViewModal(false);
    setSelectedReview(null);
  };

  const getRatingStars = (score: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(score)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {score.toFixed(1)}/5
        </span>
      </div>
    );
  };

  const getRatingLabel = (score: number) => {
    const roundedScore = Math.round(score);
    return ratingLabels[roundedScore as keyof typeof ratingLabels] || 'Non évalué';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Performances</h1>
          <p className="text-gray-600">Évaluations et revues de performance des employés</p>
        </div>
        {hasPermission('performance.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle Évaluation</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une évaluation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les types</option>
            {Object.entries(reviewTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les employés</option>
            {employees.map((employee: any) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des évaluations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review: any) => (
          <div key={review.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {review.employee?.firstName} {review.employee?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {reviewTypeLabels[review.type as keyof typeof reviewTypeLabels]}
                  </p>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(review.reviewDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 bg-blue-100 rounded-full">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Score global</span>
                  {getRatingStars(review.overallScore)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {getRatingLabel(review.overallScore)}
                </div>
              </div>

              {review.strengths && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Points forts</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {review.strengths}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Évaluateur: {review.reviewer?.firstName} {review.reviewer?.lastName}
                </div>
                <div className="flex items-center space-x-2">
                  {hasPermission('performance.read') && (
                    <button 
                      onClick={() => handleViewReview(review)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Affichage de{' '}
                <span className="font-medium">{(page - 1) * 10 + 1}</span>
                {' '}à{' '}
                <span className="font-medium">
                  {Math.min(page * 10, pagination.total)}
                </span>
                {' '}sur{' '}
                <span className="font-medium">{pagination.total}</span>
                {' '}résultats
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNum === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucune évaluation */}
      {reviews.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune évaluation trouvée</h3>
          <p className="mt-2 text-sm text-gray-500">
            Commencez par créer une évaluation de performance.
          </p>
          {hasPermission('performance.create') && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Créer une évaluation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreatePerformanceReviewModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <ViewPerformanceReviewModal 
        isOpen={showViewModal} 
        onClose={handleCloseModals}
        review={selectedReview}
      />
    </div>
  );
};