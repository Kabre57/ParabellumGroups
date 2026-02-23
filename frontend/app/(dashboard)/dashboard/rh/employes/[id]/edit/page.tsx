'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hrService, Employee } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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

  const { mutate, isLoading } = useMutation({
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Nom" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
          <Input placeholder="Prénom" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          <Input placeholder="Téléphone" value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} />
          <Input placeholder="Poste" value={form.position} onChange={(e) => handleChange('position', e.target.value)} />
          <Input placeholder="Département" value={form.department} onChange={(e) => handleChange('department', e.target.value)} />
          <Input
            placeholder="Salaire mensuel (FCFA)"
            type="number"
            min={1}
            value={form.salary}
            onChange={(e) => handleChange('salary', e.target.value)}
          />
          <Input placeholder="Matricule" value={form.matricule} onChange={(e) => handleChange('matricule', e.target.value)} />
          <Input placeholder="Adresse" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
          <Input placeholder="Nationalité" value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} />
          <Input placeholder="Numéro CNPS" value={form.cnpsNumber} onChange={(e) => handleChange('cnpsNumber', e.target.value)} />
          <Input placeholder="Numéro CNAM" value={form.cnamNumber} onChange={(e) => handleChange('cnamNumber', e.target.value)} />
          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground block mb-1">Date d'embauche</label>
            <Input type="date" value={form.hireDate} onChange={(e) => handleChange('hireDate', e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
            />
            <label htmlFor="active" className="text-sm text-muted-foreground">
              Actif
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/rh/employes/${id}`)} disabled={isLoading}>
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
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : 'Enregistrer'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
