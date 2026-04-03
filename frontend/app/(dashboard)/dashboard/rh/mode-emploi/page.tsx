'use client';

import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function RhModeEmploiPage() {
  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Mode d'emploi LOGIPAIE RH"
        description="Guide d'utilisation du module RH/Paie."
      />

      <Card>
        <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
          <p>
            Cette section reprend les bonnes pratiques du classeur LOGIPAIE_RH. Utilisez les sous-modules
            personnel, paie, déclarations et rapports pour suivre l’ensemble du cycle RH.
          </p>
          <ul className="list-disc pl-5">
            <li>Commencez par renseigner les paramètres entreprise et taux.</li>
            <li>Créez les fiches personnel et contrats.</li>
            <li>Saisissez les variables mensuelles (heures sup, primes, retenues).</li>
            <li>Générez la paie puis éditez bulletins et livres de paie.</li>
            <li>Réalisez les déclarations ITS/FDFP/CNPS/DISA/DASC.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
