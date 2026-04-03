'use client';

import { logipaieService } from '@/shared/api/hr';
import { LogipaieCrudPage } from '@/components/hr/logipaie/LogipaieCrudPage';

export default function RhParametresPage() {
  return (
    <LogipaieCrudPage
      title="Paramètres entreprise & paie"
      description="Paramètres généraux de la paie (taux, plafonds, entreprise)."
      queryKey={['logipaie-configurations']}
      queryFn={() => logipaieService.getConfigurations({ pageSize: 200 })}
      columns={[
        { key: 'nomEntreprise', label: 'Entreprise' },
        { key: 'sigle', label: 'Sigle' },
        { key: 'numeroCc', label: 'N° CC' },
        { key: 'numeroCnps', label: 'N° CNPS' },
        { key: 'adresseSiege', label: 'Adresse siège' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'email', label: 'Email' },
        { key: 'smig', label: 'SMIG', align: 'right' },
        { key: 'plafondCnps', label: 'Plafond CNPS', align: 'right' },
        { key: 'tauxCnpsSalarial', label: 'Taux CNPS sal.', align: 'right' },
        { key: 'tauxCnpsPatronal', label: 'Taux CNPS pat.', align: 'right' },
      ]}
      emptyLabel="Aucun paramétrage enregistré."
    />
  );
}
