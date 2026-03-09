'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { hrService, Employee } from '@/shared/api/hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EmployeesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contractFilter, setContractFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, searchQuery, departmentFilter, statusFilter, contractFilter],
    queryFn: async () => {
      const filters: any = {};
      
      if (departmentFilter !== 'all') {
        filters.department = departmentFilter;
      }
      
      if (statusFilter !== 'all') {
        filters.isActive = statusFilter === 'active';
      }
      
      if (contractFilter !== 'all') {
        filters.employmentStatus = contractFilter;
      }

      const response = await hrService.getEmployees({
        page,
        pageSize: 10,
        query: searchQuery,
        filters,
      });
      
      return response;
    },
  });

  const handleViewEmployee = (id: string) => {
    router.push(`/dashboard/rh/employes/${id}`);
  };

  const employees = data?.data || [];
  const pagination = data?.pagination;

  // Extract unique departments
  const departments = ['all', 'IT', 'RH', 'Finance', 'Commercial', 'Production', 'Logistique'];
  const employmentStatuses = ['all', 'CDI', 'CDD', 'Stage', 'Freelance'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Employés
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez vos employés et leurs informations
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/rh/employes/new')}>
          Nouvel employé
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Rechercher par nom, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">Tous les départements</option>
              {departments.slice(1).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          <div>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
            >
              <option value="all">Tous les contrats</option>
              {employmentStatuses.slice(1).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : employees.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Type contrat</TableHead>
                  <TableHead>Date embauche</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee: Employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {employee.email}
                      </div>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {employee.employmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(employee.hireDate), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? 'success' : 'outline'}>
                        {employee.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewEmployee(employee.id)}
                        >
                          Voir profil
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/rh/employes/${employee.id}/edit`)}
                        >
                          Modifier
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.currentPage} sur {pagination.totalPages} ({pagination.totalItems} employés)
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.hasPrevious}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Aucun employé trouvé
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
