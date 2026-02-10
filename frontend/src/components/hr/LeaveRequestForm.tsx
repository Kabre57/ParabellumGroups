'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LeaveRequestFormProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type LeaveFormData = {
  employeId: string;
  typeConge: 'ANNUEL' | 'MALADIE' | 'SANS_SOLDE' | 'PARENTAL' | 'MATERNITE' | 'PATERNITE';
  dateDebut: string;
  dateFin: string;
  motif?: string;
};

export default function LeaveRequestForm({ 
  employeeId: initialEmployeeId, 
  onSuccess, 
  onCancel 
}: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<LeaveFormData>({
    employeId: initialEmployeeId || '',
    typeConge: 'ANNUEL',
    dateDebut: '',
    dateFin: '',
    motif: '',
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const response = await hrService.getEmployees({ limit: 1000 });
      return response.data || [];
    },
    enabled: !initialEmployeeId,
  });

  const createMutation = useMutation({
    mutationFn: (data: LeaveFormData) => hrService.createConge(data),
    onSuccess: () => {
      toast.success('Demande de congé créée avec succès');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création de la demande');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.employeId) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    if (!formData.dateDebut || !formData.dateFin) {
      toast.error('Veuillez renseigner les dates de début et de fin');
      return;
    }

    const dateDebut = new Date(formData.dateDebut);
    const dateFin = new Date(formData.dateFin);

    if (dateFin < dateDebut) {
      toast.error('La date de fin doit être postérieure à la date de début');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const typeConges = [
    { value: 'ANNUEL', label: 'Congé annuel' },
    { value: 'MALADIE', label: 'Congé maladie' },
    { value: 'MATERNITE', label: 'Congé maternité' },
    { value: 'PATERNITE', label: 'Congé paternité' },
    { value: 'SANS_SOLDE', label: 'Congé sans solde' },
    { value: 'PARENTAL', label: 'Autre' },
  ];

  // Calculate number of days
  const calculateDays = () => {
    if (formData.dateDebut && formData.dateFin) {
      const start = new Date(formData.dateDebut);
      const end = new Date(formData.dateFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      return diffDays;
    }
    return 0;
  };

  const numberOfDays = calculateDays();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee selection */}
      {!initialEmployeeId && (
        <div>
          <Label htmlFor="employeId">Employé *</Label>
          {employeesLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Spinner className="w-4 h-4" />
              <span className="text-sm text-gray-500">Chargement des employés...</span>
            </div>
          ) : (
            <select
              id="employeId"
              name="employeId"
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
              value={formData.employeId}
              onChange={handleChange}
              required
            >
              <option value="">Sélectionner un employé</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.position}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Leave type */}
      <div>
        <Label htmlFor="typeConge">Type de congé *</Label>
        <select
          id="typeConge"
          name="typeConge"
          className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
          value={formData.typeConge}
          onChange={handleChange}
          required
        >
          {typeConges.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateDebut">Date de début *</Label>
          <Input
            id="dateDebut"
            name="dateDebut"
            type="date"
            value={formData.dateDebut}
            onChange={handleChange}
            required
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <Label htmlFor="dateFin">Date de fin *</Label>
          <Input
            id="dateFin"
            name="dateFin"
            type="date"
            value={formData.dateFin}
            onChange={handleChange}
            required
            min={formData.dateDebut || format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      {/* Duration display */}
      {numberOfDays > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Durée: <span className="font-semibold">{numberOfDays}</span> jour{numberOfDays > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* motif */}
      <div>
        <Label htmlFor="motif">Justification / Motif</Label>
        <textarea
          id="motif"
          name="motif"
          className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background mt-1"
          placeholder="Indiquez la raison de la demande de congé..."
          value={formData.motif}
          onChange={handleChange}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={createMutation.isPending}
          >
            Annuler
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Création...
            </>
          ) : (
            'Créer la demande'
          )}
        </Button>
      </div>
    </form>
  );
}



