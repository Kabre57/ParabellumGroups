'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Download, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { hrService, Payroll } from '@/shared/api/hr';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PayrollCompliancePanel,
  PayrollExportsPanel,
  PayrollOverviewCards,
} from '@/components/hr/payroll';
import PayslipPrint from '@/components/printComponents/PayslipPrint';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value || 0);

const buildPeriodOptions = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      value,
      label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 15000);
};

const openBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const tab = window.open('', '_blank');
  if (tab) {
    tab.location.href = url;
    if (window.location.protocol === 'https:') {
      window.setTimeout(() => {
        downloadBlob(blob, filename);
      }, 1200);
    }
  } else {
    downloadBlob(blob, filename);
  }
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 15000);
};

export default function PaiePage() {
  const { user } = useAuth();
  const periodOptions = useMemo(buildPeriodOptions, []);
  const defaultPeriod = periodOptions[0]?.value || '2026-03';
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState(defaultPeriod);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [formPrimes, setFormPrimes] = useState('');
  const [formIndemnite, setFormIndemnite] = useState('');
  const [formRetenues, setFormRetenues] = useState('');
  const [formHeuresSup, setFormHeuresSup] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);
  const queryClient = useQueryClient();
  const [year, month] = periodFilter.split('-').map((value) => parseInt(value, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', periodFilter],
    queryFn: () => hrService.getPayrolls({ year, month, pageSize: 100 }),
  });
  const payrolls = data?.data ?? [];

  const { data: employeesResponse } = useQuery({
    queryKey: ['payroll-employees-for-filter'],
    queryFn: () => hrService.getEmployees({ page: 1, pageSize: 200 }),
  });
  const employees = employeesResponse?.data ?? [];

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['payroll-overview', periodFilter],
    queryFn: () => hrService.getPayrollOverview({ year, month }),
  });

  const validateMutation = useMutation({
    mutationFn: (payroll: Payroll) => hrService.updatePayroll(payroll.id, { statut: 'VALIDE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-overview'] });
      toast.success('Bulletin validé');
    },
    onError: () => toast.error('Validation impossible'),
  });

  const payMutation = useMutation({
    mutationFn: (payroll: Payroll) => hrService.updatePayroll(payroll.id, { statut: 'PAYE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-overview'] });
      toast.success('Bulletin marqué payé');
    },
    onError: () => toast.error('Mise à jour impossible'),
  });

  const handlePrint = (payroll: Payroll) => {
    const employeeAny = payroll.employee as any;
    const printData = {
      id: payroll.id,
      employee: payroll.employee
        ? {
            firstName: payroll.employee.firstName || '',
            lastName: payroll.employee.lastName || '',
            matricule: payroll.employee.matricule || '',
            cnpsNumber: payroll.employee.cnpsNumber || employeeAny?.cnps_number || '',
            cnamNumber: payroll.employee.cnamNumber || employeeAny?.cnam_number || '',
            position: payroll.employee.position || '',
          }
        : undefined,
      period: payroll.period,
      baseSalary: payroll.grossSalary || 0,
      overtime: payroll.heuresSup || 0,
      bonuses: payroll.bonuses || 0,
      allowances: payroll.indemnite || 0,
      deductions: payroll.deductions || [],
      netSalary: payroll.netSalary || 0,
      createdAt: payroll.createdAt || new Date().toISOString(),
    };

    setSelectedPayslip(printData);
    setShowPrint(true);
  };

  const exportDisaMutation = useMutation({
    mutationFn: () => hrService.exportPayrollDisa({ year, month }),
    onSuccess: (blob) => downloadBlob(blob, `disa-${periodFilter}.csv`),
    onError: () => toast.error("Export DISA indisponible"),
  });

  const exportDgiMutation = useMutation({
    mutationFn: () => hrService.exportPayrollDgi({ year, month }),
    onSuccess: (blob) => downloadBlob(blob, `dgi-paie-${periodFilter}.csv`),
    onError: () => toast.error("Export DGI indisponible"),
  });

  const groupedPdfMutation = useMutation({
    mutationFn: (employeeIds?: string[]) => hrService.downloadGroupedPayrollPdf({ month, year, employeeIds }),
    onSuccess: (blob) => openBlob(blob, `bulletins-${periodFilter}.pdf`),
    onError: () => toast.error('Impression groupée indisponible'),
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      hrService.updatePayroll(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-overview'] });
      toast.success('Bulletin recalculé');
      setEditing(null);
    },
    onError: () => toast.error('Recalcul impossible'),
  });

  const generateMutation = useMutation({
    mutationFn: () => hrService.generateAllPayslips({ mois: month, annee: year }),
    onSuccess: () => {
      toast.success('Paie générée pour la période sélectionnée');
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-overview'] });
    },
    onError: (error: any) => toast.error(error?.message || 'Génération impossible'),
  });

  const getStatusBadge = (status: string | undefined) => {
    const current = String(status || 'genere').toLowerCase();
    const badges: Record<string, { label: string; className: string }> = {
      brouillon: { label: 'Brouillon', className: 'bg-slate-100 text-slate-800' },
      draft: { label: 'Brouillon', className: 'bg-slate-100 text-slate-800' },
      genere: { label: 'Généré', className: 'bg-blue-100 text-blue-800' },
      valide: { label: 'Validé', className: 'bg-amber-100 text-amber-800' },
      validated: { label: 'Validé', className: 'bg-amber-100 text-amber-800' },
      paye: { label: 'Payé', className: 'bg-green-100 text-green-800' },
      paid: { label: 'Payé', className: 'bg-green-100 text-green-800' },
    };
    const badge = badges[current] || badges.genere;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const filteredPayrolls = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return payrolls;

    return payrolls.filter((payroll) => {
      const matchesEmployee = employeeFilter === 'all' || payroll.employeeId === employeeFilter;
      const haystack = [
        payroll.employee?.firstName,
        payroll.employee?.lastName,
        payroll.employee?.matricule,
        payroll.period,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query) && matchesEmployee;
    });
  }, [employeeFilter, payrolls, searchQuery]);

  const { canCreate, canUpdate, canApprove, canExport } = getCrudVisibility(user, {
    read: ['payroll.read', 'payroll.read_all', 'payroll.read_own'],
    create: ['payroll.create', 'payroll.process'],
    update: ['payroll.update', 'payroll.process'],
    approve: ['payroll.validate', 'payroll.process'],
    export: ['payroll.export'],
  });

  const totalGross = payrolls.reduce((sum, payroll) => sum + (payroll.grossSalary || 0), 0);
  const totalNet = payrolls.reduce((sum, payroll) => sum + (payroll.netSalary || 0), 0);
  const totalCharges = payrolls.reduce(
    (sum, payroll) => sum + (payroll.socialContributions || payroll.deductions || 0),
    0
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Paie</h1>
            <p className="mt-2 text-muted-foreground">
              Gérez la paie ivoirienne, les bulletins, les obligations CNPS/DGI/CMU/ITS et les exports RH.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {canExport ? (
              <Button variant="outline" onClick={() => exportDgiMutation.mutate()} disabled={exportDgiMutation.isPending}>
                <Download className="mr-2 h-4 w-4" />
                Export rapide DGI
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {generateMutation.isPending ? 'Génération...' : 'Générer la période'}
              </Button>
            ) : null}
          </div>
        </div>

        <Tabs defaultValue="executive" className="space-y-4">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="executive">Vue exécutive</TabsTrigger>
            <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
            <TabsTrigger value="compliance">Conformité & exports</TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-4">
            {overviewLoading || !overview ? (
              <Card className="p-10">
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : (
              <>
                <PayrollOverviewCards overview={overview} formatCurrency={formatCurrency} />
                <PayrollCompliancePanel overview={overview} />
              </>
            )}
          </TabsContent>

          <TabsContent value="bulletins" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Brut total</div>
                <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalGross)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Net total</div>
                <div className="mt-2 text-2xl font-semibold text-green-700">{formatCurrency(totalNet)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Charges</div>
                <div className="mt-2 text-2xl font-semibold text-amber-700">{formatCurrency(totalCharges)}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Payés</div>
                <div className="mt-2 text-2xl font-semibold">
                  {payrolls.filter((payroll) => ['paye', 'paid'].includes(String(payroll.status || '').toLowerCase())).length}/{payrolls.length}
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Bulletins de paie</h2>
                  <p className="text-sm text-muted-foreground">Gérez vos bulletins et leurs informations sur la période.</p>
                </div>
                <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end">
                  <div className="relative w-full lg:max-w-xl">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="pl-10"
                      placeholder="Rechercher par employé, matricule ou période..."
                    />
                  </div>
                  <select
                    value={employeeFilter}
                    onChange={(event) => setEmployeeFilter(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:min-w-[240px]"
                  >
                    <option value="all">Tous les employés</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} {employee.matricule ? `- ${employee.matricule}` : ''}
                      </option>
                    ))}
                  </select>
                  {canExport ? (
                    <Button
                      variant="outline"
                      onClick={() => groupedPdfMutation.mutate(filteredPayrolls.map((payroll) => payroll.employeeId))}
                      disabled={groupedPdfMutation.isPending || filteredPayrolls.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {groupedPdfMutation.isPending ? 'Préparation...' : 'Imprimer groupé'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <Spinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px]">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-sm">
                        <th className="px-4 py-3 font-semibold">Employé</th>
                        <th className="px-4 py-3 font-semibold">Période</th>
                        <th className="px-4 py-3 text-right font-semibold">Brut</th>
                        <th className="px-4 py-3 text-right font-semibold">Charges</th>
                        <th className="px-4 py-3 text-right font-semibold">IGR</th>
                        <th className="px-4 py-3 text-right font-semibold">Primes</th>
                        <th className="px-4 py-3 text-right font-semibold">Net à payer</th>
                        <th className="px-4 py-3 font-semibold">Statut</th>
                        <th className="px-4 py-3 font-semibold">Paiement</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayrolls.map((payroll) => (
                        <tr key={payroll.id} className="border-b align-top last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {payroll.employee?.firstName
                                ? `${payroll.employee.firstName} ${payroll.employee.lastName ?? ''}`
                                : payroll.employeeId}
                            </div>
                            {payroll.employee?.matricule ? (
                              <div className="text-xs text-muted-foreground">Matricule {payroll.employee.matricule}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(`${payroll.period}-01`).toLocaleDateString('fr-FR', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(payroll.grossSalary || 0)}</td>
                          <td className="px-4 py-3 text-right text-amber-700">
                            -{formatCurrency(payroll.socialContributions || payroll.deductions || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-700">
                            -{formatCurrency(payroll.taxAmount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">
                            {payroll.bonuses ? `+${formatCurrency(payroll.bonuses)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-700">
                            {formatCurrency(payroll.netSalary || 0)}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(payroll.status)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {canExport ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrint(payroll)}
                                >
                                  <Download className="mr-1 h-3.5 w-3.5" />
                                  Imprimer
                                </Button>
                              ) : null}
                              {canUpdate ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditing(payroll);
                                    setFormPrimes(String(payroll.bonuses ?? payroll.primes ?? 0));
                                    setFormIndemnite(String(payroll.indemnite ?? 0));
                                    setFormRetenues(String(payroll.autresRetenues ?? 0));
                                    setFormHeuresSup(String(payroll.heuresSup ?? 0));
                                  }}
                                >
                                  Ajuster
                                </Button>
                              ) : null}
                              {canApprove && ['draft', 'genere', 'brouillon'].includes(String(payroll.status || '').toLowerCase()) ? (
                                <Button
                                  size="sm"
                                  onClick={() => validateMutation.mutate(payroll)}
                                  disabled={validateMutation.isPending}
                                >
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  Valider
                                </Button>
                              ) : null}
                              {canApprove && ['valide', 'validated', 'validee'].includes(String(payroll.status || '').toLowerCase()) ? (
                                <Button
                                  size="sm"
                                  className="bg-green-600 text-white hover:bg-green-700"
                                  onClick={() => payMutation.mutate(payroll)}
                                  disabled={payMutation.isPending}
                                >
                                  Payer
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPayrolls.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                            Aucun bulletin trouvé pour cette période.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            {showPrint && selectedPayslip ? (
              <PayslipPrint
                salary={selectedPayslip}
                onClose={() => {
                  setShowPrint(false);
                  setSelectedPayslip(null);
                }}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            {overviewLoading || !overview ? (
              <Card className="p-10">
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </Card>
            ) : (
              <>
                <PayrollExportsPanel
                  overview={overview}
                  onExportDisa={() => exportDisaMutation.mutate()}
                  onExportDgi={() => exportDgiMutation.mutate()}
                  isExportingDisa={exportDisaMutation.isPending}
                  isExportingDgi={exportDgiMutation.isPending}
                />
                <PayrollCompliancePanel overview={overview} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {canUpdate && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ajuster le bulletin</h3>
              <button onClick={() => setEditing(null)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primes</label>
                <Input value={formPrimes} onChange={(event) => setFormPrimes(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Indemnités</label>
                <Input value={formIndemnite} onChange={(event) => setFormIndemnite(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Autres retenues</label>
                <Input value={formRetenues} onChange={(event) => setFormRetenues(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Heures sup. (montant)</label>
                <Input value={formHeuresSup} onChange={(event) => setFormHeuresSup(event.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button
                onClick={() =>
                  adjustMutation.mutate({
                    id: editing.id,
                    data: {
                      primes: Number(formPrimes || 0),
                      indemnite: Number(formIndemnite || 0),
                      autresRetenues: Number(formRetenues || 0),
                      heuresSup: Number(formHeuresSup || 0),
                    },
                  })
                }
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? 'Recalcul...' : 'Recalculer'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
