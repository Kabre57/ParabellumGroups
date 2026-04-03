'use client';

import { useMemo, useState } from 'react';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

export default function PaieBulletinsGroupesPage() {
  const [openPreview, setOpenPreview] = useState(false);

  const columns = useMemo(
    (): { key: string; label: string; align?: 'left' | 'center' | 'right' }[] => [
      { key: 'matricule', label: 'Matricule' },
      { key: 'nomComplet', label: 'Salarié' },
      { key: 'salaireBrut', label: 'Brut', align: 'right' },
      { key: 'retenues', label: 'Retenues', align: 'right' },
      { key: 'netPaye', label: 'Net', align: 'right' },
    ],
    []
  );

  return (
    <>
      <LogipaieCrudPage
        title="Bulletins groupés"
        description="Registre groupé des bulletins (LOGIPAIE RH)."
        queryKey={['logipaie-bulletins-groupes']}
        queryFn={() => hrService.getPayrolls({ pageSize: 200 })}
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
            matricule: item.employee?.matricule || item.employeeId,
            nomComplet: `${item.employee?.lastName || ''} ${item.employee?.firstName || ''}`.trim(),
            salaireBrut: item.grossSalary || item.salaireBrut || '-',
            retenues: item.deductions || item.totalRetenues || '-',
            netPaye: item.netSalary || item.salaireNet || '-',
            raw: item,
          }))
        }
        emptyLabel="Aucun bulletin groupé disponible."
      />

      {openPreview && (
        <LogipaieDocumentModal
          open={openPreview}
          onOpenChange={setOpenPreview}
          title="Bulletins groupés"
          subtitle="Édition groupée"
          meta={`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`}
          sections={[
            {
              title: 'Résumé',
              rows: [
                { label: 'Nombre de bulletins', value: 'Voir la liste' },
                { label: 'Mode de paie', value: 'Virement' },
              ],
            },
          ]}
        />
      )}
    </>
  );
}
