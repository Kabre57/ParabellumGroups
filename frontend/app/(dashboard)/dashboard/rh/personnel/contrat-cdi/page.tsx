'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function ContratCdiPage() {
  const [selected, setSelected] = useState<any | null>(null);

  const columns = useMemo(
    (): {
      key: string;
      label: string;
      align?: 'left' | 'center' | 'right';
      format?: (_value: unknown, row: Record<string, any>) => ReactNode;
    }[] => [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nomComplet', label: 'Nom & prénoms' },
      { key: 'poste', label: 'Poste' },
      { key: 'direction', label: 'Direction' },
      { key: 'service', label: 'Service' },
      { key: 'dateSignature', label: 'Date signature' },
      { key: 'dateDebut', label: "Date d'entrée" },
      { key: 'salaireBase', label: 'Salaire de base', align: 'right' },
      { key: 'statut', label: 'Statut' },
      {
        key: 'actions',
        label: 'Actions',
        format: (_value: unknown, row: Record<string, any>) => (
          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
            Aperçu
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <>
      <LogipaieCrudPage
        title="Contrat de travail CDI"
        description="Contrats CDI générés à partir des fiches du personnel (format LOGIPAIE)."
        queryKey={['logipaie-contrats-cdi']}
        queryFn={async () => {
          const response = await hrService.getContracts({ limit: 200 });
          const data = response.data.filter(
            (row: any) => (row.contractType || row.typeContrat || '').toUpperCase() === 'CDI'
          );
          return { ...response, data };
        }}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.id,
            matricule: row.employee?.matricule || row.employeeId,
            nomComplet: `${row.employee?.lastName || ''} ${row.employee?.firstName || ''}`.trim(),
            poste: row.position || row.posteOccupe,
            direction: row.department || row.direction,
            service: row.service || row.department,
            dateSignature: row.signedDate
              ? new Date(row.signedDate).toLocaleDateString('fr-FR')
              : '-',
            dateDebut: row.startDate
              ? new Date(row.startDate).toLocaleDateString('fr-FR')
              : '-',
            salaireBase: row.salary ?? row.salaireBaseMensuel ?? '-',
            statut: row.status ?? row.statutContrat ?? '-',
            raw: row,
          }))
        }
        emptyLabel="Aucun contrat CDI disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Contrat de travail CDI"
          subtitle={`Salarié: ${selected.nomComplet || '-'}`}
          meta={`Date de signature: ${selected.dateSignature || '-'}`}
          sections={[
            {
              title: 'Employeur',
              rows: [
                { label: 'Raison sociale', value: selected.raw?.entreprise ?? 'PARABELLUM GROUP' },
                { label: 'Adresse', value: selected.raw?.adresseEntreprise ?? '-' },
                { label: 'N° CNPS', value: selected.raw?.numeroCnpsEntreprise ?? '-' },
                { label: 'N° CC', value: selected.raw?.numeroCcEntreprise ?? '-' },
              ],
            },
            {
              title: 'Salarié',
              rows: [
                { label: 'Matricule', value: selected.matricule },
                { label: 'Nom et prénoms', value: selected.nomComplet },
                { label: 'Civilité', value: selected.raw?.employee?.civilite ?? '-' },
                {
                  label: 'Date de naissance',
                  value: selected.raw?.employee?.dateNaissance
                    ? new Date(selected.raw.employee.dateNaissance).toLocaleDateString('fr-FR')
                    : '-',
                },
                { label: 'Nationalité', value: selected.raw?.employee?.nationalite ?? '-' },
                { label: 'Adresse', value: selected.raw?.employee?.adressePersonnelle ?? '-' },
              ],
            },
            {
              title: 'Détails du contrat',
              rows: [
                { label: 'Type de contrat', value: 'CDI' },
                { label: "Date d'entrée", value: selected.dateDebut },
                { label: 'Poste', value: selected.poste },
                { label: 'Catégorie', value: selected.raw?.categorieProfessionnelle ?? '-' },
                { label: 'Régime', value: selected.raw?.regime ?? '-' },
                { label: 'Type d’emploi', value: selected.raw?.typeEmploi ?? '-' },
                { label: 'Salaire de base', value: selected.salaireBase },
                { label: 'Prime de transport', value: selected.raw?.primeTransport ?? '-' },
                { label: 'Période d’essai', value: selected.raw?.periodeEssaiMois ?? '-' },
                { label: 'Statut', value: selected.statut },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
