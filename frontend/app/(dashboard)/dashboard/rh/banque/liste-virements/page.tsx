'use client';

import { useMemo, useState } from 'react';
import { logipaieService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function ListeVirementsPage() {
  const [openPreview, setOpenPreview] = useState(false);

  const columns = useMemo(
    (): { key: string; label: string; align?: 'left' | 'center' | 'right' }[] => [
      { key: 'banque', label: 'Banque' },
      { key: 'nomComplet', label: 'Nom & prénoms' },
      { key: 'rib', label: 'RIB / Compte' },
      { key: 'montantNet', label: 'Montant net', align: 'right' },
      { key: 'codeBanque', label: 'Code banque' },
      { key: 'codeGuichet', label: 'Code guichet' },
    ],
    []
  );

  return (
    <>
      <LogipaieCrudPage
        title="Liste des salaires à virer"
        description="Liste nominative des virements (LOGIPAIE RH)."
        queryKey={['logipaie-details-virement']}
        queryFn={() => logipaieService.getDetailsVirement({ pageSize: 200 })}
        columns={[
          ...columns,
          {
            key: 'actions',
            label: 'Actions',
            format: () => (
              <Button size="sm" variant="outline" onClick={() => setOpenPreview(true)}>
                Aperçu
              </Button>
            ),
          },
        ]}
        mapRows={(rows) =>
          rows.map((item: any) => ({
            id: item.id,
            banque: item.banque ?? item.bankName ?? '-',
            nomComplet: item.nomComplet ?? item.employe?.nomComplet ?? '-',
            rib: item.ribBeneficiaire ?? item.rib ?? '-',
            montantNet: item.montantNet ?? '-',
            codeBanque: item.codeBanque ?? '-',
            codeGuichet: item.codeGuichet ?? '-',
            raw: item,
          }))
        }
        emptyLabel="Aucune liste de virements disponible."
      />

      {openPreview && (
        <LogipaieDocumentModal
          open={openPreview}
          onOpenChange={setOpenPreview}
          title="Liste des salaires à virer"
          subtitle="Virements par salarié"
          meta={`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`}
          sections={[
            {
              title: 'Résumé',
              rows: [
                { label: 'Mode de paiement', value: 'Virement' },
                { label: 'Banque', value: 'Selon le salarié' },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
