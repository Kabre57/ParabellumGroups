'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { commercialService } from '@/shared/api/commercial';
import type {
  Prospect,
  ProspectPriority,
  ProspectStage,
  UpdateProspectRequest,
} from '@/shared/api/commercial';

interface EditProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

const stages: Array<{ value: ProspectStage; label: string }> = [
  { value: 'preparation', label: 'Preparation' },
  { value: 'research', label: 'Recherche et qualification' },
  { value: 'contact', label: 'Prise de contact' },
  { value: 'discovery', label: 'Entretien de decouverte' },
  { value: 'proposal', label: 'Proposition' },
  { value: 'negotiation', label: 'Negociation' },
  { value: 'on_hold', label: 'En attente' },
  { value: 'won', label: 'Converti en client' },
  { value: 'lost', label: 'Perdu ou a relancer' },
];

const priorities: Array<{ value: ProspectPriority; label: string }> = [
  { value: 'A', label: 'Haute (A)' },
  { value: 'B', label: 'Moyenne (B)' },
  { value: 'C', label: 'Basse (C)' },
  { value: 'D', label: 'Tres basse (D)' },
];

const toDateInputValue = (value?: string) => (value ? value.slice(0, 10) : '');

const toFormData = (prospect: Prospect): UpdateProspectRequest => ({
  companyName: prospect.companyName,
  contactName: prospect.contactName,
  civilite: prospect.civilite,
  position: prospect.position,
  email: prospect.email,
  emailSecondaire: prospect.emailSecondaire,
  phone: prospect.phone,
  mobile: prospect.mobile,
  fax: prospect.fax,
  linkedin: prospect.linkedin,
  website: prospect.website,
  sector: prospect.sector,
  codeActivite: prospect.codeActivite,
  idu: prospect.idu,
  ncc: prospect.ncc,
  rccm: prospect.rccm,
  address: prospect.address,
  address2: prospect.address2,
  address3: prospect.address3,
  postalCode: prospect.postalCode,
  city: prospect.city,
  region: prospect.region,
  country: prospect.country,
  gpsCoordinates: prospect.gpsCoordinates,
  accessNotes: prospect.accessNotes,
  stage: prospect.stage,
  priority: prospect.priority,
  source: prospect.source,
  potentialValue: prospect.potentialValue,
  closingProbability: prospect.closingProbability,
  estimatedCloseDate: toDateInputValue(prospect.estimatedCloseDate),
  notes: prospect.notes,
  tags: prospect.tags,
});

export default function EditProspectModal({ isOpen, onClose, prospect }: EditProspectModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateProspectRequest>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!prospect) return;
    setFormData(toFormData(prospect));
    setTagInput('');
  }, [prospect]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProspectRequest) => {
      if (!prospect) throw new Error('No prospect selected');
      return commercialService.updateProspect(prospect.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect mis a jour avec succes');
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Impossible de mettre a jour ce prospect.'
      );
    },
  });

  const handleChange = <K extends keyof UpdateProspectRequest>(field: K, value: UpdateProspectRequest[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: 'potentialValue' | 'closingProbability', value: string) => {
    handleChange(field, value ? Number(value) : undefined);
  };

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || (formData.tags || []).includes(nextTag)) return;
    handleChange('tags', [...(formData.tags || []), nextTag]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    handleChange(
      'tags',
      (formData.tags || []).filter((item) => item !== tag)
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.companyName?.trim() || !formData.contactName?.trim() || !formData.source?.trim()) {
      toast.error("Entreprise, contact principal et source sont obligatoires.");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (!isOpen || !prospect) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative inline-block w-full max-w-5xl overflow-hidden rounded-lg bg-white text-left shadow-xl">
          <div className="px-4 pt-5 pb-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Modifier le prospect</h3>
                <p className="text-sm text-gray-500">Mettez a jour les informations commerciales et locales.</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <section>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Entreprise</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Entreprise / raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName || ''}
                      onChange={(event) => handleChange('companyName', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Secteur d'activite</label>
                    <input
                      type="text"
                      value={formData.sector || ''}
                      onChange={(event) => handleChange('sector', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code activite</label>
                    <input
                      type="text"
                      value={formData.codeActivite || ''}
                      onChange={(event) => handleChange('codeActivite', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Site web</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(event) => handleChange('website', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">IDU</label>
                    <input
                      type="text"
                      value={formData.idu || ''}
                      onChange={(event) => handleChange('idu', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">NCC</label>
                    <input
                      type="text"
                      value={formData.ncc || ''}
                      onChange={(event) => handleChange('ncc', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">RCCM</label>
                    <input
                      type="text"
                      value={formData.rccm || ''}
                      onChange={(event) => handleChange('rccm', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Contact principal</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Civilite</label>
                    <select
                      value={formData.civilite || ''}
                      onChange={(event) => handleChange('civilite', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">Selectionner</option>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                      <option value="Mlle">Mlle</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom du contact <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName || ''}
                      onChange={(event) => handleChange('contactName', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Poste</label>
                    <input
                      type="text"
                      value={formData.position || ''}
                      onChange={(event) => handleChange('position', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(event) => handleChange('email', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email secondaire</label>
                    <input
                      type="email"
                      value={formData.emailSecondaire || ''}
                      onChange={(event) => handleChange('emailSecondaire', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telephone fixe</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(event) => handleChange('phone', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="tel"
                      value={formData.mobile || ''}
                      onChange={(event) => handleChange('mobile', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fax</label>
                    <input
                      type="text"
                      value={formData.fax || ''}
                      onChange={(event) => handleChange('fax', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                    <input
                      type="url"
                      value={formData.linkedin || ''}
                      onChange={(event) => handleChange('linkedin', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Adresse </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quartier</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(event) => handleChange('address', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rue / residence</label>
                    <input
                      type="text"
                      value={formData.address2 || ''}
                      onChange={(event) => handleChange('address2', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Repere visuel</label>
                    <input
                      type="text"
                      value={formData.address3 || ''}
                      onChange={(event) => handleChange('address3', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Boite postale (BP)</label>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(event) => handleChange('postalCode', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Commune / ville</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(event) => handleChange('city', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">District / region</label>
                    <input
                      type="text"
                      value={formData.region || ''}
                      onChange={(event) => handleChange('region', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Coordonnees GPS</label>
                    <input
                      type="text"
                      value={formData.gpsCoordinates || ''}
                      onChange={(event) => handleChange('gpsCoordinates', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pays</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(event) => handleChange('country', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Infos d'acces</label>
                    <textarea
                      rows={3}
                      value={formData.accessNotes || ''}
                      onChange={(event) => handleChange('accessNotes', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">Suivi commercial</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Etape</label>
                    <select
                      value={formData.stage}
                      onChange={(event) => handleChange('stage', event.target.value as ProspectStage)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      {stages.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priorite</label>
                    <select
                      value={formData.priority}
                      onChange={(event) => handleChange('priority', event.target.value as ProspectPriority)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.source || ''}
                      onChange={(event) => handleChange('source', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Potentiel estime (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.potentialValue ?? ''}
                      onChange={(event) => handleNumberChange('potentialValue', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Probabilite de closing (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.closingProbability ?? ''}
                      onChange={(event) => handleNumberChange('closingProbability', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Echeance estimee</label>
                    <input
                      type="date"
                      value={formData.estimatedCloseDate || ''}
                      onChange={(event) => handleChange('estimatedCloseDate', event.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              <section>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Ajouter
                  </button>
                </div>
                {(formData.tags || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(formData.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
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
              </section>

              <section>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(event) => handleChange('notes', event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </section>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    !formData.companyName?.trim() ||
                    !formData.contactName?.trim() ||
                    !formData.source?.trim()
                  }
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
