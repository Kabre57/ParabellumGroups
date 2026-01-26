'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import hrService, { CreateLeaveRequest } from '@/shared/api/services/hr';
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

export default function LeaveRequestForm({ 
  employeeId: initialEmployeeId, 
  onSuccess, 
  onCancel 
}: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<CreateLeaveRequest>({
    employeeId: initialEmployeeId || '',
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const response = await hrService.getEmployees({ pageSize: 1000 });
      return response.data || [];
    },
    enabled: !initialEmployeeId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLeaveRequest) => hrService.createLeaveRequest(data),
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
    if (!formData.employeeId) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Veuillez renseigner les dates de début et de fin');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
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

  const leaveTypes = [
    { value: 'ANNUAL', label: 'Congé annuel' },
    { value: 'SICK', label: 'Congé maladie' },
    { value: 'MATERNITY', label: 'Congé maternité' },
    { value: 'PATERNITY', label: 'Congé paternité' },
    { value: 'UNPAID', label: 'Congé sans solde' },
    { value: 'OTHER', label: 'Autre' },
  ];

  // Calculate number of days
  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
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
          <Label htmlFor="employeeId">Employé *</Label>
          {employeesLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Spinner className="w-4 h-4" />
              <span className="text-sm text-gray-500">Chargement des employés...</span>
            </div>
          ) : (
            <select
              id="employeeId"
              name="employeeId"
              className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
              value={formData.employeeId}
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
        <Label htmlFor="leaveType">Type de congé *</Label>
        <select
          id="leaveType"
          name="leaveType"
          className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
          value={formData.leaveType}
          onChange={handleChange}
          required
        >
          {leaveTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Date de début *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Date de fin *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            required
            min={formData.startDate || format(new Date(), 'yyyy-MM-dd')}
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

      {/* Reason */}
      <div>
        <Label htmlFor="reason">Justification / Motif</Label>
        <textarea
          id="reason"
          name="reason"
          className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background mt-1"
          placeholder="Indiquez la raison de la demande de congé..."
          value={formData.reason}
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
