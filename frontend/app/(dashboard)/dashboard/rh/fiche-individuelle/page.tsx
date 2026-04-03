'use client';

import { useQuery } from '@tanstack/react-query';
import { hrService } from '@/shared/api/hr';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { LogipaieTable } from '@/components/hr/logipaie/LogipaieTable';
import { Spinner } from '@/components/ui/spinner';

export default function FicheIndividuellePage() {
  const employeesQuery = useQuery({
    queryKey: ['logipaie-fiche-individuelle'],
    queryFn: () => hrService.getEmployees({ pageSize: 200 }),
  });

  const rows = (employeesQuery.data?.data ?? []).map((employee) => ({
    id: employee.id,
    matricule: employee.matricule || employee.id,
    nomComplet: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
    poste: employee.position ?? '-',
    direction: employee.department ?? '-',
    service: employee.department ?? '-',
    dateEntree: employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '-',
    statut: employee.employmentStatus ?? '-',
    telephonePersonnel: employee.phoneNumber ?? '-',
    emailPersonnel: employee.email ?? '-',
  }));

  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Fiche individuelle"
        description="Fiches individuelles du personnel."
      />

      {employeesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <LogipaieTable
          columns={[
            { key: 'matricule', label: 'Matricule' },
            { key: 'nomComplet', label: 'Nom complet' },
            { key: 'poste', label: 'Poste' },
            { key: 'direction', label: 'Direction' },
            { key: 'service', label: 'Service' },
            { key: 'dateEntree', label: 'Date entrée' },
            { key: 'statut', label: 'Statut' },
            { key: 'telephonePersonnel', label: 'Téléphone' },
            { key: 'emailPersonnel', label: 'Email' },
          ]}
          rows={rows}
          emptyLabel="Aucune fiche individuelle disponible."
        />
      )}
    </div>
  );
}
