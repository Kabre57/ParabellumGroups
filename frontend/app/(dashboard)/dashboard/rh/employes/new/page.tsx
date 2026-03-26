'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { toast } from 'sonner';

export default function NewEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    address: '',
    nationality: '',
    cnpsNumber: '',
    cnamNumber: '',
    position: '',
    department: '',
    hireDate: '',
    salary: '',
    matricule: '',
    isActive: true,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      hrService.createEmployee({
        ...form,
        salary: Number(form.salary || 0),
      }),
    onSuccess: () => {
      toast.success('Employé créé', { description: 'Le collaborateur a été ajouté.' });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push('/dashboard/rh/employes');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Impossible de créer cet employé.");
    },
  });

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nouvel employé</h1>
          <p className="text-sm text-muted-foreground">Renseignez les informations principales.</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <EmployeeForm
          form={form}
          onChange={handleChange}
          matriculeHint="Matricule"
          matriculeReadOnly
          matriculePlaceholder="Généré automatiquement (ex: PBL0001)"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.position ||
                !form.department ||
                !form.hireDate ||
                Number(form.salary) <= 0
              ) {
                toast.error(
                  "Nom, prénom, email, poste, département, salaire (>0) et date d'embauche sont obligatoires."
                );
                return;
              }
              mutate();
            }}
            disabled={isPending}
          >
            {isPending ? <Spinner size="sm" /> : 'Créer'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
