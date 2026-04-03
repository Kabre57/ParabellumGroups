'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { hrService } from '@/shared/api/hr';
import { Button } from '@/components/ui/button';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';
import { LogipaieDocumentModal } from '@/components/hr/logipaie/LogipaieDocumentModal';

const parseDeductions = (deductions: any) => {
  if (Array.isArray(deductions)) return deductions;
  if (typeof deductions === 'string') {
    try {
      const parsed = JSON.parse(deductions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildBulletinLines = (raw: any) => {
  if (Array.isArray(raw?.lines)) {
    return raw.lines.map((line: any) => [
      line.code ?? line.numero ?? '-',
      line.label ?? line.libelle ?? '-',
      line.base ?? line.baseMontant ?? '-',
      line.rate ?? line.taux ?? line.quantite ?? '-',
      line.gain ?? line.gains ?? line.montantGain ?? '-',
      line.deduction ?? line.retenue ?? line.montantRetenue ?? '-',
    ]);
  }
  return [
    [
      '01',
      'Salaire de base',
      raw?.baseSalary ?? raw?.salaireBase ?? '-',
      raw?.joursTravailles ?? raw?.jours ?? '-',
      raw?.baseSalary ?? raw?.salaireBase ?? '-',
      '-',
    ],
    [
      '02',
      "Prime d'ancienneté",
      raw?.primeAnciennete ?? '-',
      raw?.tauxAnciennete ?? '-',
      raw?.primeAnciennete ?? '-',
      '-',
    ],
    [
      '03',
      'Heures supplémentaires',
      raw?.heuresSuppMontant ?? '-',
      raw?.heuresSupp ?? '-',
      raw?.heuresSuppMontant ?? '-',
      '-',
    ],
  ];
};

export default function PaieBulletinsPage() {
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
      { key: 'periode', label: 'Période' },
      { key: 'salaireBrut', label: 'Salaire brut', align: 'right' },
      { key: 'netPaye', label: 'Net à payer', align: 'right' },
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
        title="Bulletins de paie"
        description="Bulletins individuels (LOGIPAIE RH)."
        queryKey={['logipaie-bulletins-individuels']}
        queryFn={() => hrService.getPayrolls({ pageSize: 200 })}
        columns={columns}
        mapRows={(rows) =>
          rows.map((row: any) => ({
            id: row.id,
            matricule: row.employee?.matricule || row.employeeId,
            nomComplet: `${row.employee?.lastName || ''} ${row.employee?.firstName || ''}`.trim(),
            periode: row.period || row.periode || '-',
            salaireBrut: row.grossSalary ?? row.salaireBrut ?? '-',
            netPaye: row.netSalary ?? row.salaireNet ?? '-',
            statut: row.statutPaiement ?? row.paymentStatus ?? '-',
            raw: row,
          }))
        }
        emptyLabel="Aucun bulletin individuel disponible."
      />

      {selected?.raw && (
        <LogipaieDocumentModal
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          title="Bulletin de paie"
          subtitle={`Salarié: ${selected.nomComplet || '-'}`}
          meta={`Période: ${selected.periode || '-'}\nDate de paie: ${
            selected.raw?.datePaiement
              ? new Date(selected.raw.datePaiement).toLocaleDateString('fr-FR')
              : '-'
          }`}
          sections={[
            {
              title: 'Employeur',
              rows: [
                { label: 'Raison sociale', value: selected.raw?.entreprise ?? 'PARABELLUM GROUP' },
                { label: 'N° CNPS', value: selected.raw?.numeroCnpsEntreprise ?? '-' },
                { label: 'N° CC', value: selected.raw?.numeroCcEntreprise ?? '-' },
              ],
            },
            {
              title: 'Salarié',
              rows: [
                { label: 'Matricule', value: selected.matricule },
                { label: 'Nom et prénoms', value: selected.nomComplet },
                { label: 'Poste', value: selected.raw?.employee?.position ?? '-' },
                { label: 'N° CNPS', value: selected.raw?.employee?.cnpsNumber ?? '-' },
              ],
            },
            {
              title: 'Rémunération',
              rows: [
                { label: 'Salaire de base', value: selected.raw?.baseSalary ?? selected.raw?.salaireBase ?? '-' },
                { label: 'Primes', value: selected.raw?.bonuses ?? selected.raw?.primesTotal ?? '-' },
                { label: 'Heures supplémentaires', value: selected.raw?.overtime ?? selected.raw?.heuresSuppMontant ?? '-' },
                { label: 'Salaire brut', value: selected.salaireBrut },
                { label: 'Total retenues', value: selected.raw?.deductions ?? selected.raw?.totalRetenues ?? '-' },
                { label: 'Net à payer', value: selected.netPaye },
              ],
            },
            {
              title: 'Retenues',
              rows: parseDeductions(selected.raw?.deductions || selected.raw?.retenues).map((ded: any) => ({
                label: ded.label ?? 'Retenue',
                value: `${ded.amount ?? '-'} (${ded.rate ?? '-'})`,
              })),
            },
          ]}
          table={{
            headers: ['Code', 'Libellé', 'Base', 'Taux/Qté', 'Gains', 'Retenues'],
            rows: buildBulletinLines(selected.raw),
          }}
        />
      )}
    </>
  );
}
