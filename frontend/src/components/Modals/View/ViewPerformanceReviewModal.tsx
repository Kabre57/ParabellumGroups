// src/components/Modals/View/ViewPerformanceReviewModal.tsx
import React from 'react';
import { X, User, Star, Target, Calendar, TrendingUp } from 'lucide-react';

interface ViewPerformanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
}

export const ViewPerformanceReviewModal: React.FC<ViewPerformanceReviewModalProps> = ({ isOpen, onClose, review }) => {
  if (!isOpen || !review) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

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

  const getRatingStars = (score: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= Math.round(score)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-lg font-semibold">
          {score.toFixed(1)}/5
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Évaluation de Performance
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* En-tête */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Employé Évalué</h4>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-medium text-gray-900">
                    {review.employee?.firstName} {review.employee?.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {review.employee?.position}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Détails de l'Évaluation</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-gray-400 mr-2" />
                  <span>Type: {reviewTypeLabels[review.type as keyof typeof reviewTypeLabels]}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span>Date: {formatDate(review.reviewDate)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span>Période: {formatDate(review.periodStart)} - {formatDate(review.periodEnd)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score global */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Score Global</h4>
            <div className="flex items-center justify-between">
              {getRatingStars(review.overallScore)}
              <span className="text-lg font-semibold text-gray-700">
                {ratingLabels[Math.round(review.overallScore) as keyof typeof ratingLabels]}
              </span>
            </div>
          </div>

          {/* Critères d'évaluation */}
          {review.criteria && review.criteria.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Critères d'Évaluation</h4>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Critère</th>
                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Poids</th>
                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Score</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commentaires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {review.criteria.map((criterion: any, index: number) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                          <div className="font-medium">{criterion.criteria}</div>
                          {criterion.description && (
                            <div className="text-sm text-gray-500">{criterion.description}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-center">
                          {criterion.weight}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-center">
                          <div className="flex items-center justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= criterion.score
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-1">({criterion.score})</span>
                          </div>
                        </td>
                        <td className="py-4 pl-4 pr-3 text-sm text-gray-900">
                          {criterion.comments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Points forts et amélioration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
            {review.strengths && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Points Forts</h4>
                <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md">{review.strengths}</p>
              </div>
            )}
            {review.areasToImprove && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Axes d'Amélioration</h4>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">{review.areasToImprove}</p>
              </div>
            )}
          </div>

          {/* Évaluateur */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Évaluateur</h4>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {review.reviewer?.firstName} {review.reviewer?.lastName}
                </div>
                <div className="text-sm text-gray-500">
                  {review.reviewer?.position}
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};