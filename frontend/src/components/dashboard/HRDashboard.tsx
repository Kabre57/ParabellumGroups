'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, CalendarDays, Wallet, CalendarClock } from 'lucide-react';
import { analyticsService } from '@/shared/api/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(amount) || 0);

export function HRDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => analyticsService.getHRStats(),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error || !data) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Impossible de charger les indicateurs RH depuis l’API RH dédiée. Vérifiez `HR_SERVICE_URL` et l’accès à cette API.
      </div>
    );
  }

  const cards = [
    { title: 'Effectif actif', value: String(data.totalEmployes ?? 0), icon: Users },
    { title: 'Dernière période de paie', value: data.lastPeriode || 'Aucune', icon: CalendarDays },
    { title: 'Masse salariale', value: formatCurrency(data.totalPayroll), icon: Wallet },
    { title: 'Employés en congé', value: String(data.enConge ?? 0), icon: CalendarClock },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ title, value, icon: Icon }) => (
        <Card key={title}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
            <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
