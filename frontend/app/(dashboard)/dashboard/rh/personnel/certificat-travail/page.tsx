'use client';

import { useMemo, useState } from 'react';
import { logipaieService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function CertificatTravailPage() {
  const [selected, setSelected] = useState<any | null>(null);

  const columns = useMemo(
    () => [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nomComplet', label: 'Nom & prénoms' },
      { key: 'poste', label: 'Poste' },
      { key: 'dateEntree', label: "Date d'entrée" },
      { key: 'dateSortie', label: 'Date de sortie' },
      { key: 'dateEmission', label: "Date d'émission" },
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
        title="Certificat de travail"
        description="Certificats de travail générés selon LOGIPAIE RH."
        queryKey={['logipaie-certificats-travail']}
        queryFn={() => logipaieService.getCertificatsTravail({ pageSize: 200 })}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.id,
            matricule: row.matricule,
            nomComplet: row.employe?.nomComplet ?? row.nomComplet ?? '-',
            poste: row.postesOccupes ?? row.posteOccupe ?? '-',
            dateEntree: row.dateEntree ? new Date(row.dateEntree).toLocaleDateString('fr-FR') : '-',
            dateSortie: row.dateSortie ? new Date(row.dateSortie).toLocaleDateString('fr-FR') : '-',
            dateEmission: row.dateEmission
              ? new Date(row.dateEmission).toLocaleDateString('fr-FR')
              : '-',
            raw: row,
          }))
        }
        emptyLabel="Aucun certificat de travail disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Certificat de travail"
          subtitle={`Salarié: ${selected.nomComplet || '-'}`}
          meta={`Date d'émission: ${selected.dateEmission || '-'}`}
          sections={[
            {
              title: 'Employeur',
              rows: [
                { label: 'Entreprise', value: selected.raw?.entreprise ?? 'PARABELLUM GROUP' },
                { label: 'Adresse', value: selected.raw?.adresseEntreprise ?? '-' },
                { label: 'Téléphone', value: selected.raw?.telephoneEntreprise ?? '-' },
                { label: 'N° CNPS', value: selected.raw?.numeroCnpsEntreprise ?? '-' },
              ],
            },
            {
              title: 'Salarié',
              rows: [
                { label: 'Matricule', value: selected.matricule },
                { label: 'Nom et prénoms', value: selected.nomComplet },
                { label: "Date d'entrée", value: selected.dateEntree },
                { label: 'Date de sortie', value: selected.dateSortie },
                { label: 'Postes occupés', value: selected.poste },
                { label: 'Catégorie', value: selected.raw?.categorieProfessionnelle ?? '-' },
              ],
            },
            {
              title: 'Signature',
              rows: [{ label: 'Autorité', value: selected.raw?.signatureAutorite ?? '-' }],
            },
          ]}
        />
      )}
    </>
  );
}
