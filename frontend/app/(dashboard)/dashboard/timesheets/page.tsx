'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Plus, Search, CheckCircle, XCircle, FileText } from 'lucide-react';
import { apiClient } from '@/shared/api/shared/client';

interface Timesheet {
  id: string;
  employee: string;
  project: string;
  task: string;
  date: string;
  hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  description: string;
}

const TimesheetsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: timesheets = [], isLoading } = useQuery<Timesheet[]>({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const response = await apiClient.get('/timesheets');
      return response.data?.data || response.data || [];
    }
  });

  const stats = {
    totalHours: timesheets.reduce((sum: number, ts: Timesheet) => sum + (ts.hours || 0), 0),
    pending: timesheets.filter((ts: Timesheet) => ts.status === 'submitted').length,
    approved: timesheets.filter((ts: Timesheet) => ts.status === 'approved').length,
    activeProjects: new Set(timesheets.map((ts: Timesheet) => ts.project)).size
  };

  const filteredTimesheets = timesheets.filter((timesheet: Timesheet) => {
    const matchesSearch = 
      timesheet.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.task.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Timesheet['status']) => {
    const colors = {
      draft: 'bg-gray-500/10 text-gray-500',
      submitted: 'bg-yellow-500/10 text-yellow-500',
      approved: 'bg-green-500/10 text-green-500',
      rejected: 'bg-red-500/10 text-red-500'
    };
    return colors[status];
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feuilles de Temps</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle saisie
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures totales</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente validation</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projets actifs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saisies de temps</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="submitted">Soumis</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Employé</th>
                  <th className="p-3 text-left font-medium">Projet</th>
                  <th className="p-3 text-left font-medium">Tâche</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Heures</th>
                  <th className="p-3 text-left font-medium">Statut</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{timesheet.employee}</div>
                      </div>
                    </td>
                    <td className="p-3">{timesheet.project}</td>
                    <td className="p-3">{timesheet.task}</td>
                    <td className="p-3">
                      {new Date(timesheet.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{timesheet.hours}h</span>
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(timesheet.status)}>
                        {timesheet.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {timesheet.status === 'submitted' && (
                          <>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {timesheet.status === 'draft' && (
                          <Button variant="outline" size="sm">
                            Modifier
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Détails
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetsPage;
