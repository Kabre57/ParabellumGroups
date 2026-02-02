'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { commercialService } from '@/shared/api/services/commercial';
import type { CreateProspectRequest, ProspectStage, ProspectPriority } from '@/shared/api/types';

interface CreateProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const stages: { value: ProspectStage; label: string }[] = [
  { value: 'preparation', label: 'Préparation' },
  { value: 'research', label: 'Recherche & Qualification' },
  { value: 'contact', label: 'Prise de Contact' },
  { value: 'discovery', label: 'Entretien Découverte' },
  { value: 'proposal', label: 'Proposition & Conclusion' },
  { value: 'won', label: 'Client Converti' },
  { value: 'lost', label: 'Perdu/Nurturing' }
];

const priorities: { value: ProspectPriority; label: string }[] = [
  { value: 'A', label: 'Haute (A)' },
  { value: 'B', label: 'Moyenne (B)' },
  { value: 'C', label: 'Basse (C)' }
];

export default function CreateProspectModal({ isOpen, onClose }: CreateProspectModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateProspectRequest>({
    companyName: '',
    contactName: '',
    position: '',
    email: '',
    phone: '',
    website: '',
    sector: '',
    employees: undefined,
    revenue: undefined,
    address: '',
    city: '',
    postalCode: '',
    country: 'cote d\'ivoire',
    stage: 'preparation',
    priority: 'C',
    source: '',
    potentialValue: undefined,
    closingProbability: undefined,
    estimatedCloseDate: '',
    notes: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateProspectRequest) => commercialService.createProspect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect créé avec succès');
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la création du prospect');
    }
  });

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactName: '',
      position: '',
      email: '',
      phone: '',
      website: '',
      sector: '',
      employees: undefined,
      revenue: undefined,
      address: '',
      city: '',
      postalCode: '',
      country: 'cote d\'ivoire',
      stage: 'preparation',
      priority: 'C',
      source: '',
      potentialValue: undefined,
      closingProbability: undefined,
      estimatedCloseDate: '',
      notes: '',
      tags: []
    });
    setTagInput('');
  };

  const handleChange = (field: keyof CreateProspectRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags?.filter(t => t !== tag) || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim() || !formData.contactName.trim()) {
      toast.error('Le nom de l\'entreprise et le nom du contact sont obligatoires');
      return;
    }

    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Créer un nouveau prospect</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations de l'entreprise */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Informations de l'entreprise</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom de l'entreprise <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site web</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Secteur d'activité</label>
                    <input
                      type="text"
                      value={formData.sector}
                      onChange={(e) => handleChange('sector', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre d'employés</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.employees || ''}
                      onChange={(e) => handleChange('employees', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chiffre d'affaires (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.revenue || ''}
                      onChange={(e) => handleChange('revenue', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Informations du contact */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Contact principal</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom du contact <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Poste</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Adresse</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Adresse</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ville</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code postal</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Pays</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Informations commerciales */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Informations commerciales</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Étape</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => handleChange('stage', e.target.value as ProspectStage)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {stages.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priorité</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value as ProspectPriority)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <input
                      type="text"
                      value={formData.source}
                      onChange={(e) => handleChange('source', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="LinkedIn, Salon, Référence..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valeur potentielle (€)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.potentialValue || ''}
                      onChange={(e) => handleChange('potentialValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Probabilité de closing (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.closingProbability || ''}
                      onChange={(e) => handleChange('closingProbability', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date de closing estimée</label>
                    <input
                      type="date"
                      value={formData.estimatedCloseDate}
                      onChange={(e) => handleChange('estimatedCloseDate', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Ajouter un tag..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Ajouter
                  </button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Notes internes sur ce prospect..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Création...' : 'Créer le prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
