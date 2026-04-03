'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { logipaieService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function OrdreVirementPage() {
  const [selected, setSelected] = useState<any | null>(null);

  const columns = useMemo(
    (): {
      key: string;
      label: string;
      align?: 'left' | 'center' | 'right';
      format?: (_value: unknown, row: Record<string, any>) => ReactNode;
    }[] => [
      { key: 'periode', label: 'Période' },
      { key: 'banque', label: 'Banque émetteur' },
      { key: 'beneficiaires', label: 'Bénéficiaires', align: 'right' },
      { key: 'montant', label: 'Montant total', align: 'right' },
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
        title="Ordre de virement"
        description="Ordres de virement (LOGIPAIE RH)."
        queryKey={['logipaie-ordres-virement']}
        queryFn={() => logipaieService.getOrdresBancaires({ pageSize: 200 })}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.id,
            periode: row.periode ?? '-',
            banque: row.banqueEmetteur ?? '-',
            beneficiaires: row.nombreBeneficiaires ?? '-',
            montant: row.montantTotalLot ?? '-',
            statut: row.statut ?? '-',
            dateVirement: row.dateVirement
              ? new Date(row.dateVirement).toLocaleDateString('fr-FR')
              : '-',
            raw: row,
          }))
        }
        emptyLabel="Aucun ordre de virement disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Ordre de virement"
          subtitle={`Banque: ${selected.banque || '-'}`}
          meta={`Date: ${selected.dateVirement || '-'}\nRéférence: ${
            selected.raw?.referenceVirement ?? selected.raw?.reference ?? '—'
          }`}
          sections={[
            {
              title: 'Coordonnées',
              rows: [
                { label: 'Banque destinataire', value: selected.banque },
                { label: 'Compte débité', value: selected.raw?.compteDebite ?? '-' },
                { label: 'Signataire', value: selected.raw?.signataire ?? '-' },
              ],
            },
            {
              title: 'Détails de l’ordre',
              rows: [
                { label: 'Période', value: selected.periode },
                { label: 'Nombre bénéficiaires', value: selected.beneficiaires },
                { label: 'Montant total', value: selected.montant },
                {
                  label: 'Montant en lettres',
                  value: selected.raw?.montantLettres ?? '-',
                },
                { label: 'Motif', value: selected.raw?.motif ?? 'Virement des salaires' },
                { label: 'Statut', value: selected.statut },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
