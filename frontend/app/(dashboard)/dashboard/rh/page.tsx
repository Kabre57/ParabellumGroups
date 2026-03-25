'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { hrService } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PayrollCompliancePanel, PayrollOverviewCards } from '@/components/hr/payroll';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function RHDashboardPage() {
  const router = useRouter();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['rh-dashboard-overview', month, year],
    queryFn: () => hrService.getPayrollOverview({ month, year }),
  });

  const shortcuts = [
    {
      title: 'Employés',
      description: 'Gérez les employés et leurs dossiers.',
      href: '/dashboard/rh/employes',
      accent: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Paie',
      description: 'Gérez la paie, les bulletins et les obligations légales.',
      href: '/dashboard/rh/paie',
      accent: 'bg-green-100 text-green-700',
    },
    {
      title: 'Congés',
      description: 'Suivez les demandes et validations de congés.',
      href: '/dashboard/rh/conges',
      accent: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Prêts & avances',
      description: 'Pilotez les prêts salariés et retenues mensuelles.',
      href: '/dashboard/rh/prets',
      accent: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ressources Humaines</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez vos employés, la paie ivoirienne et les obligations RH dans un même cockpit.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/rh/paie')}>Ouvrir le module Paie</Button>
      </div>

      {isLoading || !overview ? (
        <Card className="p-10">
          <div className="flex justify-center">
            <Spinner />
          </div>
        </Card>
      ) : (
        <>
          <PayrollOverviewCards overview={overview} formatCurrency={formatCurrency} />
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <Card className="p-5">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Vue exécutive RH</h2>
                <p className="text-sm text-muted-foreground">
                  Le logiciel couvre le calcul automatique, les bulletins PDF, les exports DGI/DISA
                  et le suivi d&apos;effectif jusqu&apos;à 100 salariés.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.href}
                    type="button"
                    onClick={() => router.push(shortcut.href)}
                    className="rounded-lg border p-4 text-left transition hover:border-primary hover:bg-slate-50"
                  >
                    <div className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${shortcut.accent}`}>
                      Module RH
                    </div>
                    <div className="mt-3 text-lg font-semibold">{shortcut.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{shortcut.description}</div>
                  </button>
                ))}
              </div>
            </Card>

            <PayrollCompliancePanel overview={overview} />
          </div>
        </>
      )}
    </div>
  );
}
