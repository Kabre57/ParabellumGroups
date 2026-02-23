'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { hrService, Employee } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    enabled: !!id,
    queryFn: async () => hrService.getEmployee(id!),
  });

  if (isLoading) {
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

  const employee: Employee = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/rh/employes/${id}/edit`)}>
            Modifier
          </Button>
          <Button onClick={() => router.push('/dashboard/rh/employes')}>Retour</Button>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge variant={employee.isActive ? 'success' : 'secondary'}>
            {employee.isActive ? 'Actif' : 'Inactif'}
          </Badge>
          <Badge variant="outline">{employee.employmentStatus || 'Contrat'}</Badge>
          {employee.matricule && <Badge variant="outline">Matricule {employee.matricule}</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Poste</p>
            <p className="font-medium">{employee.position || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Département</p>
            <p className="font-medium">{employee.department || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date d'embauche</p>
            <p className="font-medium">
              {employee.hireDate ? format(new Date(employee.hireDate), 'dd MMM yyyy', { locale: fr }) : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Salaire</p>
            <p className="font-medium">{employee.salary ? `${employee.salary} FCFA` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">CNPS</p>
            <p className="font-medium">{employee.cnpsNumber || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">CNAM</p>
            <p className="font-medium">{employee.cnamNumber || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Téléphone</p>
            <p className="font-medium">{employee.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nationalité</p>
            <p className="font-medium">{employee.nationality || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Adresse</p>
            <p className="font-medium">{employee.address || '-'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
