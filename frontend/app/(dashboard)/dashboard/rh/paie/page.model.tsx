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

// État, chargement et actions du parcours d'interface.


export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value || 0);



export const buildPeriodOptions = () => {
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



export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 15000);
};



export const openBlob = (blob: Blob, filename: string) => {
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



export const toNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};



export const toRatePercent = (value: unknown) => {
  const number = toNumber(value);
  if (!number) return undefined;
  return number > 1 ? number : number * 100;
};



export const buildCompanyInfo = (configuration: any) => ({
  name: configuration?.nomEntreprise || configuration?.companyName || 'Parabellum Groups',
  sigle: configuration?.sigle || configuration?.nomEntreprise || 'Parabellum Groups',
  address: configuration?.adresseSiege || configuration?.address || '',
  immatriculationCNPS: configuration?.immatriculationCNPS || configuration?.numeroCnps || '',
  cnamNumber: configuration?.numeroCnam || configuration?.cnamNumber || '',
  fdfpNumber: configuration?.numeroFdfp || configuration?.fdfpNumber || '',
  idu: configuration?.idu || '',
  rccm: configuration?.rccm || '',
  compteContribuable: configuration?.compteContribuable || configuration?.numeroCc || '',
  phone: configuration?.telephone || '',
  email: configuration?.email || '',
});



export const buildPrintRows = (payroll: Payroll) => {
  const variables = payroll.variablesMensuelle || {};
  const baseSalary = toNumber(payroll.salaireBase || payroll.baseSalary || payroll.grossSalary);
  const overtime = toNumber(payroll.heuresSuppMontant || payroll.heuresSup);
  const primes = toNumber(payroll.primesTotal || payroll.bonuses);
  const transport = toNumber(variables.primeTransport);
  const gross = toNumber(payroll.grossSalary);
  const gains = [
    { code: 100, label: 'SALAIRE DE BASE', base: baseSalary, workDays: 30, amount: baseSalary },
    { code: 210, label: 'HEURES SUPPLEMENTAIRES', base: baseSalary, hourDay: '', amount: overtime },
    { code: 300, label: 'PRIMES', base: 0, hourDay: '', amount: primes },
    { code: 740, label: 'INDEMNITE DE TRANSPORT', base: 0, hourDay: '', amount: transport },
  ].filter((row) => row.code === 100 || row.amount > 0);

  const gainsTotal = gains.reduce((sum, row) => sum + row.amount, 0);
  if (gross > gainsTotal + 1) {
    gains.push({ code: 780, label: 'AUTRES GAINS', base: 0, hourDay: '', amount: gross - gainsTotal });
  }

  const totalRetenues = toNumber(payroll.totalRetenues || payroll.deductions);
  const deductions = [
    {
      code: 610,
      label: 'C.N.P.S',
      base: baseSalary,
      rate: undefined,
      amount: toNumber(payroll.cotisationCnpsSalariale),
    },
    { code: 600, label: 'I.S', base: baseSalary, rate: undefined, amount: toNumber(payroll.impotIs) },
    { code: 620, label: 'C.N', base: baseSalary, rate: undefined, amount: toNumber(payroll.impotCn) },
    { code: 640, label: 'I.G.R', base: baseSalary, rate: undefined, amount: toNumber(payroll.impotIgr || payroll.taxAmount) },
  ].filter((row) => row.amount > 0);

  const deductionsTotal = deductions.reduce((sum, row) => sum + row.amount, 0);
  if (totalRetenues > deductionsTotal + 1) {
    deductions.push({
      code: 800,
      label: 'AUTRES RETENUES',
      base: 0,
      rate: undefined,
      amount: totalRetenues - deductionsTotal,
    });
  }

  return { gains, deductions };
};

export function usePaiePageModel() {

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
  const { data: payrollConfiguration } = useQuery({
    queryKey: ['payroll-configuration'],
    queryFn: () => hrService.getPayrollConfiguration(),
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
    const { gains, deductions } = buildPrintRows(payroll);
    const companyInfo = buildCompanyInfo(payrollConfiguration);
    const printData = {
      id: payroll.id,
      employer: companyInfo,
      employee: payroll.employee
        ? {
            firstName: payroll.employee.firstName || '',
            lastName: payroll.employee.lastName || '',
            matricule: payroll.employee.matricule || '',
            cnpsNumber: payroll.employee.cnpsNumber || employeeAny?.numeroCnps || employeeAny?.cnps_number || '',
            cnamNumber: payroll.employee.cnamNumber || employeeAny?.numeroCnam || employeeAny?.cnam_number || '',
            position: payroll.employee.position || '',
            department: payroll.employee.department || '',
            category: payroll.employee.category || '',
            taxParts: payroll.employee.taxParts || 1,
            hireDate: payroll.employee.hireDate || '',
            salaryType: payroll.employee.contractType || 'Mensuel',
          }
        : undefined,
      period: payroll.period,
      gains,
      deductions: deductions.map((row) => ({
        ...row,
        rate:
          row.code === 610
            ? toRatePercent(payrollConfiguration?.tauxCnpsSalarial)
            : undefined,
      })),
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
  return {
    user,
    periodOptions,
    defaultPeriod,
    searchQuery,
    setSearchQuery,
    employeeFilter,
    setEmployeeFilter,
    periodFilter,
    setPeriodFilter,
    editing,
    setEditing,
    formPrimes,
    setFormPrimes,
    formIndemnite,
    setFormIndemnite,
    formRetenues,
    setFormRetenues,
    formHeuresSup,
    setFormHeuresSup,
    selectedPayslip,
    setSelectedPayslip,
    showPrint,
    setShowPrint,
    queryClient,
    year,
    month,
    data,
    isLoading,
    payrolls,
    employeesResponse,
    employees,
    overview,
    overviewLoading,
    payrollConfiguration,
    validateMutation,
    payMutation,
    handlePrint,
    exportDisaMutation,
    exportDgiMutation,
    groupedPdfMutation,
    adjustMutation,
    generateMutation,
    getStatusBadge,
    filteredPayrolls,
    canCreate,
    canUpdate,
    canApprove,
    canExport,
    totalGross,
    totalNet,
    totalCharges,
  };
}
