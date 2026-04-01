'use client';

import Link from 'next/link';
import { MapPin, PhoneCall, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProspectionTerrainPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Prospection terrain</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Suivi des visites, actions terrain et opportunites a relancer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/commercial/prospects">Retour prospection</Link>
          </Button>
          <Button>Nouveau passage</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visites planifiees</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Relances terrain</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-muted-foreground">A confirmer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prospects a visiter</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-xs text-muted-foreground">Base locale</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carte des zones</CardTitle>
          <CardDescription>
            Planifiez les visites et regroupez les prospects par zone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 text-sm text-muted-foreground">
            Carte OpenStreetMap a integrer.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visites et comptes-rendus</CardTitle>
          <CardDescription>Centralisez les actions terrain et decisions prises.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            Aucune visite enregistree. Lancez une nouvelle prospection terrain pour commencer.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
