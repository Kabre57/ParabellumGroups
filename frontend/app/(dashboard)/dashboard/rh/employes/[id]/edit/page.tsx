'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hrService, Employee } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmployeeForm } from '@/components/hr/EmployeeForm';
import { toast } from 'sonner';

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id;

  const { data, isLoading: isLoadingEmployee, isError } = useQuery({
    queryKey: ['employee', id],
    enabled: !!id,
    queryFn: async () => hrService.getEmployee(id!),
  });

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

  useEffect(() => {
    if (data) {
      const emp: Employee = data;
      setForm({
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        phoneNumber: emp.phoneNumber || '',
        address: emp.address || '',
        nationality: emp.nationality || '',
        cnpsNumber: emp.cnpsNumber || '',
        cnamNumber: emp.cnamNumber || '',
        position: emp.position || '',
        department: emp.department || '',
        hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : '',
        salary: emp.salary ? String(emp.salary) : '',
        matricule: emp.matricule || '',
        isActive: emp.isActive ?? true,
      });
    }
  }, [data]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      hrService.updateEmployee(id!, {
        ...form,
        salary: Number(form.salary || 0),
      }),
    onSuccess: () => {
      toast.success('Employé mis à jour');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      router.push(`/dashboard/rh/employes/${id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Impossible de mettre à jour cet employé.");
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoadingEmployee) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Employé introuvable.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/rh/employes')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modifier l'employé</h1>
          <p className="text-sm text-muted-foreground">Mettez à jour les informations principales.</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <EmployeeForm
          form={form}
          onChange={handleChange}
          matriculeHint="Matricule"
          matriculeReadOnly
          matriculePlaceholder="Matricule généré par le système"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/rh/employes/${id}`)} disabled={isPending}>
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
            {isPending ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
