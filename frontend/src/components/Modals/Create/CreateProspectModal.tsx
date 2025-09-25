import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Building2, User, Mail, Phone, MapPin, DollarSign, Target } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const prospectService = createCrudService('prospects');

const createProspectSchema = z.object({
  companyName: z.string().min(1, 'Nom de l\'entreprise requis'),
  contactName: z.string().min(1, 'Nom du contact requis'),
  position: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
  industry: z.string().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
  estimatedValue: z.number().min(0).optional(),
  priority: z.enum(['A', 'B', 'C']).default('B'),
  source: z.string().optional(),
  notes: z.string().optional(),
  // Qualification BANT
  hasBudget: z.boolean().default(false),
  isDecisionMaker: z.boolean().default(false),
  hasNeed: z.boolean().default(false),
  timeline: z.string().optional()
});

type CreateProspectFormData = z.infer<typeof createProspectSchema>;

interface CreateProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProspectModal: React.FC<CreateProspectModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue // Add setValue here
  } = useForm<CreateProspectFormData>({
    resolver: zodResolver(createProspectSchema),
    defaultValues: {
      priority: 'B',
      hasBudget: false,
      isDecisionMaker: false,
      hasNeed: false
    }
  });

  const priority = watch('priority');
  const hasBudget = watch('hasBudget');
  const isDecisionMaker = watch('isDecisionMaker');
  const hasNeed = watch('hasNeed');

  const createProspectMutation = useMutation({
    mutationFn: (data: CreateProspectFormData) => prospectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateProspectFormData) => {
    setIsLoading(true);
    try {
      await createProspectMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcul automatique de la priorité selon BANT
  React.useEffect(() => {
    const bantScore = [hasBudget, isDecisionMaker, hasNeed].filter(Boolean).length;
    let newPriority = 'C';
    
    if (bantScore >= 3) newPriority = 'A';
    else if (bantScore >= 2) newPriority = 'B';
    
    if (priority !== newPriority) {
      setValue('priority', newPriority as 'A' | 'B' | 'C');
    }
  }, [hasBudget, isDecisionMaker, hasNeed, priority, setValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Ajouter un Prospect
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations entreprise */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Informations Entreprise
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                <input
                  {...register('companyName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ACME Corporation"
                />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                <input
                  {...register('industry')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Technologie, Finance, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taille de l'entreprise</label>
                <select
                  {...register('companySize')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="1-10">1-10 employés</option>
                  <option value="11-50">11-50 employés</option>
                  <option value="51-200">51-200 employés</option>
                  <option value="201-1000">201-1000 employés</option>
                  <option value="1000+">1000+ employés</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                <input
                  {...register('website')}
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://exemple.com"
                />
                {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>}
              </div>
            </div>
          </div>

          {/* Contact principal */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Contact Principal
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contact</label>
                <input
                  {...register('contactName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Jean Dupont"
                />
                {errors.contactName && <p className="mt-1 text-sm text-red-600">{errors.contactName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste/Fonction</label>
                <input
                  {...register('position')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Directeur IT, CEO, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    {...register('email')}
                    type="email"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="contact@exemple.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    {...register('phone')}
                    type="tel"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+225 07 07 07 07 07"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Qualification BANT */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Qualification BANT</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    {...register('hasBudget')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    <strong>Budget</strong> : Le prospect a un budget défini
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    {...register('isDecisionMaker')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    <strong>Authority</strong> : Contact est décideur ou influenceur
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    {...register('hasNeed')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    <strong>Need</strong> : Besoin identifié et confirmé
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <select
                    {...register('timeline')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    <option value="immediate">Immédiat (&lt; 1 mois)</option>
                    <option value="short">Court terme (1-3 mois)</option>
                    <option value="medium">Moyen terme (3-6 mois)</option>
                    <option value="long">Long terme (&gt; 6 mois)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valeur estimée (FCFA)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      {...register('estimatedValue', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Priorité calculée automatiquement */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Priorité calculée :</span>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${
                  priority === 'A' ? 'bg-red-100 text-red-800' :
                  priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  Priorité {priority}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {priority === 'A' && 'Prospect chaud - À contacter en priorité'}
                {priority === 'B' && 'Prospect tiède - Suivi régulier'}
                {priority === 'C' && 'Prospect froid - Nurturing long terme'}
              </p>
            </div>
          </div>

          {/* Informations complémentaires */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source du prospect</label>
                <select
                  {...register('source')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="website">Site web</option>
                  <option value="referral">Recommandation</option>
                  <option value="event">Événement</option>
                  <option value="cold-call">Appel à froid</option>
                  <option value="advertising">Publicité</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                <textarea
                  {...register('address')}
                  rows={2}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Adresse complète de l'entreprise"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes de qualification</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Besoins identifiés, contexte, objections potentielles..."
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
              {isLoading ? 'Création...' : 'Ajouter le prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};