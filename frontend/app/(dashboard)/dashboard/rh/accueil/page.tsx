'use client';

import Link from 'next/link';
import { LogipaiePageHeader } from '@/components/hr/logipaie/LogipaiePageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function RhAccueilPage() {
  return (
    <div className="space-y-6">
      <LogipaiePageHeader
        title="Accueil RH / LOGIPAIE"
        description="Raccourcis rapides et points clés de la gestion RH."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Traitement paie</p>
            <p className="text-xs text-muted-foreground">Générer les bulletins et exports.</p>
            <Link href="/dashboard/rh/paie/traitement" className="mt-3 inline-flex text-sm text-primary">
              Ouvrir
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Personnel</p>
            <p className="text-xs text-muted-foreground">Liste du personnel et fiches.</p>
            <Link href="/dashboard/rh/personnel/liste" className="mt-3 inline-flex text-sm text-primary">
              Ouvrir
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Déclarations</p>
            <p className="text-xs text-muted-foreground">ITS, FDFP, CNPS, DISA, DASC.</p>
            <Link href="/dashboard/rh/declarations/its" className="mt-3 inline-flex text-sm text-primary">
              Ouvrir
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
