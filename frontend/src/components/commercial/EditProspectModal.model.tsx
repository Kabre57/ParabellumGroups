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

// État, chargement et actions du parcours d'interface.


export interface EditProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}



export const stages: Array<{ value: ProspectStage; label: string }> = [
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



export const priorities: Array<{ value: ProspectPriority; label: string }> = [
  { value: 'A', label: 'Haute (A)' },
  { value: 'B', label: 'Moyenne (B)' },
  { value: 'C', label: 'Basse (C)' },
  { value: 'D', label: 'Tres basse (D)' },
];



export const toDateInputValue = (value?: string) => (value ? value.slice(0, 10) : '');



export const toFormData = (prospect: Prospect): UpdateProspectRequest => ({
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

export function useEditProspectModalModel(__componentProps1: EditProspectModalProps) {
  const { isOpen, onClose, prospect } = __componentProps1;


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
  return {
    queryClient,
    formData,
    setFormData,
    tagInput,
    setTagInput,
    updateMutation,
    handleChange,
    handleNumberChange,
    handleAddTag,
    handleRemoveTag,
    handleSubmit,
  };
}
