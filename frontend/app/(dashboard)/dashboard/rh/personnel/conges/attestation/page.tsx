'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function CongesAttestationPage() {
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
      { key: 'typeConge', label: 'Type de congé' },
      { key: 'dateDebut', label: 'Date de départ' },
      { key: 'dateFin', label: 'Date de retour' },
      { key: 'nombreJours', label: 'Jours', align: 'right' },
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
        title="Attestation de congés"
        description="Attestations de congés générées selon LOGIPAIE RH."
        queryKey={['logipaie-conges-attestation']}
        queryFn={() => hrService.getConges({ limit: 200 })}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.id,
            matricule: row.matricule,
            nomComplet: row.nomComplet ?? row.employe?.nomComplet ?? '-',
            typeConge: row.typeConge ?? '-',
            dateDebut: row.dateDebut ? new Date(row.dateDebut).toLocaleDateString('fr-FR') : '-',
            dateFin: row.dateFin ? new Date(row.dateFin).toLocaleDateString('fr-FR') : '-',
            nombreJours: row.nombreJours ?? '-',
            allocationCongePayee: row.allocationCongePayee ?? '-',
            raw: row,
          }))
        }
        emptyLabel="Aucune attestation de congés disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Attestation de congés"
          subtitle={`Salarié: ${selected.nomComplet || '-'}`}
          meta={`Période: ${selected.dateDebut || '-'} - ${selected.dateFin || '-'}`}
          sections={[
            {
              title: 'Employeur',
              rows: [
                { label: 'Entreprise', value: selected.raw?.entreprise ?? 'PARABELLUM GROUP' },
                { label: 'Adresse', value: selected.raw?.adresseEntreprise ?? '-' },
                { label: 'Téléphone', value: selected.raw?.telephoneEntreprise ?? '-' },
              ],
            },
            {
              title: 'Salarié',
              rows: [
                { label: 'Matricule', value: selected.matricule },
                { label: 'Nom et prénoms', value: selected.nomComplet },
                { label: 'Type de congé', value: selected.typeConge },
              ],
            },
            {
              title: 'Congé',
              rows: [
                { label: 'Date de départ', value: selected.dateDebut },
                { label: 'Date de retour', value: selected.dateFin },
                { label: 'Nombre de jours', value: selected.nombreJours },
                { label: 'Allocation congé payé', value: selected.allocationCongePayee },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
