'use client';

import { useMemo, useState } from 'react';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function PersonnelFicheIndividuellePage() {
  const [selected, setSelected] = useState<any | null>(null);

  const columns = useMemo(
    () => [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nomComplet', label: 'Nom & prénoms' },
      { key: 'poste', label: 'Poste' },
      { key: 'direction', label: 'Direction' },
      { key: 'service', label: 'Service' },
      { key: 'dateEntree', label: "Date d'entrée" },
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
        title="Fiche individuelle"
        description="Fiches individuelles salariés (LOGIPAIE RH)."
        queryKey={['logipaie-personnel-fiche']}
        queryFn={() => hrService.getEmployees({ pageSize: 200 })}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.matricule ?? row.id,
            matricule: row.matricule,
            nomComplet: row.nomComplet ?? `${row.nom || ''} ${row.prenoms || ''}`.trim(),
            poste: row.posteOccupe || row.poste || '-',
            direction: row.direction ?? '-',
            service: row.service ?? '-',
            dateEntree: row.dateEntree ? new Date(row.dateEntree).toLocaleDateString('fr-FR') : '-',
            raw: row,
          }))
        }
        emptyLabel="Aucune fiche individuelle disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Fiche individuelle"
          subtitle={`Salarié: ${selected.nomComplet || '-'}`}
          meta={`Matricule: ${selected.matricule || '-'}\nDate d'entrée: ${
            selected.dateEntree || '-'
          }`}
          sections={[
            {
              title: 'Identité',
              rows: [
                { label: 'Nom et prénoms', value: selected.nomComplet },
                { label: 'Sexe', value: selected.raw?.sexe ?? '-' },
                {
                  label: 'Date de naissance',
                  value: selected.raw?.dateNaissance
                    ? new Date(selected.raw.dateNaissance).toLocaleDateString('fr-FR')
                    : '-',
                },
                { label: 'Nationalité', value: selected.raw?.nationalite ?? '-' },
                { label: 'Situation matrimoniale', value: selected.raw?.situationMatrimoniale ?? '-' },
                { label: "Nombre d'enfants", value: selected.raw?.nombreEnfants ?? '-' },
              ],
            },
            {
              title: 'Coordonnées',
              rows: [
                { label: 'Adresse', value: selected.raw?.adressePersonnelle ?? '-' },
                { label: 'Téléphone', value: selected.raw?.telephonePersonnel ?? '-' },
                { label: 'Email', value: selected.raw?.emailPersonnel ?? '-' },
                { label: "Lieu d'habitation", value: selected.raw?.lieuHabitation ?? '-' },
              ],
            },
            {
              title: 'Contrat',
              rows: [
                { label: 'Poste', value: selected.poste },
                { label: 'Direction', value: selected.direction },
                { label: 'Service', value: selected.service },
                { label: 'Catégorie', value: selected.raw?.categorie ?? '-' },
                { label: 'Régime', value: selected.raw?.regime ?? '-' },
                { label: 'Type', value: selected.raw?.typeEmploi ?? '-' },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
