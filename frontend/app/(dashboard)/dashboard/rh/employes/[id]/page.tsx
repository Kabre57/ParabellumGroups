'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import hrService from '@/shared/api/services/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalaryCalculator from '@/components/hr/SalaryCalculator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const [activeTab, setActiveTab] = useState('info');

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => hrService.getEmployee(employeeId),
    enabled: !!employeeId,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', employeeId],
    queryFn: () => hrService.getContracts(employeeId),
    enabled: !!employeeId,
  });

  const { data: payrolls, isLoading: payrollsLoading } = useQuery({
    queryKey: ['payrolls', employeeId],
    queryFn: async () => {
      const response = await hrService.getPayroll({ 
        pageSize: 100,
        filters: { employeeId }
      });
      return response.data || [];
    },
    enabled: !!employeeId,
  });

  const { data: leaveRequests, isLoading: leavesLoading } = useQuery({
    queryKey: ['leaves', employeeId],
    queryFn: async () => {
      const response = await hrService.getLeaveRequests({ 
        pageSize: 100,
        filters: { employeeId }
      });
      return response.data || [];
    },
    enabled: !!employeeId,
  });

  if (employeeLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Employé non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {employee.firstName} {employee.lastName}
            </h1>
            <Badge variant={employee.isActive ? 'success' : 'outline'}>
              {employee.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {employee.position} - {employee.department}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/rh/employes')}
          >
            Retour
          </Button>
          <Button onClick={() => router.push(`/dashboard/rh/employes/${employeeId}/edit`)}>
            Modifier
          </Button>
        </div>
      </div>

      {/* Employee Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {employee.email}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Téléphone</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {employee.phoneNumber || 'N/A'}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date d'embauche</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {format(new Date(employee.hireDate), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          <TabsTrigger value="paie">Paie</TabsTrigger>
          <TabsTrigger value="conges">Congés</TabsTrigger>
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
        </TabsList>

        {/* Informations Tab */}
        <TabsContent value="info">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prénom</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.firstName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de naissance</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">
                  {employee.dateOfBirth ? format(new Date(employee.dateOfBirth), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Adresse</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Poste</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.position}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Département</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut d'emploi</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.employmentStatus}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date d'embauche</p>
                <p className="text-base text-gray-900 dark:text-white mt-1">
                  {format(new Date(employee.hireDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Contrats Tab */}
        <TabsContent value="contrats">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Historique des contrats
            </h2>
            {contractsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : contracts && contracts.length > 0 ? (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {contract.position} - {contract.contractType}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {contract.department}
                        </p>
                      </div>
                      <Badge variant={contract.status === 'ACTIVE' ? 'success' : 'outline'}>
                        {contract.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Salaire</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: contract.currency,
                            maximumFractionDigits: 0,
                          }).format(contract.salary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Début</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(contract.startDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Fin</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contract.endDate ? format(new Date(contract.endDate), 'dd MMM yyyy', { locale: fr }) : 'Indéterminé'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Heures/semaine</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contract.workHoursPerWeek}h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucun contrat trouvé
              </p>
            )}
          </Card>
        </TabsContent>

        {/* Paie Tab */}
        <TabsContent value="paie">
          <div className="space-y-6">
            <SalaryCalculator employeeId={employeeId} />
            
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Historique des bulletins de paie
              </h2>
              {payrollsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : payrolls && payrolls.length > 0 ? (
                <div className="space-y-3">
                  {payrolls.map((payroll) => (
                    <div key={payroll.id} className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payroll.period}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Brut: {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: payroll.currency,
                            maximumFractionDigits: 0,
                          }).format(payroll.grossSalary)} | 
                          Net: {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: payroll.currency,
                            maximumFractionDigits: 0,
                          }).format(payroll.netSalary)}
                        </p>
                      </div>
                      <Badge variant={payroll.status === 'PAID' ? 'success' : 'outline'}>
                        {payroll.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Aucun bulletin de paie trouvé
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Congés Tab */}
        <TabsContent value="conges">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Historique des congés
            </h2>
            {leavesLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : leaveRequests && leaveRequests.length > 0 ? (
              <div className="space-y-3">
                {leaveRequests.map((leave) => (
                  <div key={leave.id} className="flex justify-between items-start p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {leave.leaveType}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Du {format(new Date(leave.startDate), 'dd MMM yyyy', { locale: fr })} au {format(new Date(leave.endDate), 'dd MMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {leave.totalDays} jour(s)
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Raison: {leave.reason}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      leave.status === 'PENDING' ? 'outline' :
                      leave.status === 'APPROVED' ? 'success' : 'destructive'
                    }>
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucun congé trouvé
              </p>
            )}
          </Card>
        </TabsContent>

        {/* Évaluations Tab */}
        <TabsContent value="evaluations">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Évaluations de performance
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Fonctionnalité à venir
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
