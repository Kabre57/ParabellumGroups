'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useClients, useArchiveClient } from '@/hooks/useCrm';
import { Client } from '@/shared/api/crm/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import CustomerForm from '@/components/customers/CustomerForm';
import { Search, Filter, Users, UserCheck, UserMinus, Archive } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'ARCHIVE', label: 'Archive' },
];

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: clients = [], isLoading } = useClients({ pageSize: 200 });
  const clientsArray: Client[] = Array.isArray(clients)
    ? (clients as Client[])
    : ((clients as any)?.data || []);

  const archiveMutation = useArchiveClient();

  const filteredClients = useMemo(() => {
    return clientsArray.filter((client) => {
      const matchesSearch =
        client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.raisonSociale || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.reference || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clientsArray, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = clientsArray.length;
    const actifs = clientsArray.filter((c) => c.status === 'ACTIF').length;
    const prospects = clientsArray.filter((c) => c.status === 'PROSPECT').length;
    const archives = clientsArray.filter((c) => c.status === 'ARCHIVE').length;
    return { total, actifs, prospects, archives };
  }, [clientsArray]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-800',
      PROSPECT: 'bg-blue-100 text-blue-800',
      INACTIF: 'bg-gray-100 text-gray-800',
      ARCHIVE: 'bg-amber-100 text-amber-800',
      SUSPENDU: 'bg-orange-100 text-orange-800',
      LEAD_CHAUD: 'bg-red-100 text-red-800',
      LEAD_FROID: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  const handleArchive = (client: Client) => {
    if (confirm(`Archiver le client "${client.nom}" ?`)) {
      archiveMutation.mutate(
        { id: client.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
          },
        }
      );
    }
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/crm/clients/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-muted-foreground">Gerez vos clients et leurs informations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actifs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prospects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archives</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archives}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
          <CardDescription>Rechercher, consulter et archiver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous statuts</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => setDialogOpen(true)}>Nouveau client</Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Reference</th>
                  <th className="text-left p-4 font-medium">Nom</th>
                  <th className="text-left p-4 font-medium">Contact principal</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t hover:bg-muted/50">
                    <td className="p-4 font-medium">{client.reference}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span>{client.nom}</span>
                        {client.raisonSociale && (
                          <span className="text-xs text-muted-foreground">{client.raisonSociale}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      {client.contacts && client.contacts[0]
                        ? `${client.contacts[0].prenom} ${client.contacts[0].nom}`
                        : '-'}
                    </td>
                    <td className="p-4">{client.email || '-'}</td>
                    <td className="p-4">{client.typeClient?.libelle || '-'}</td>
                    <td className="p-4">{getStatusBadge(client.status)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(client.id)}>
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(client)}
                          disabled={archiveMutation.isPending}
                        >
                          Archiver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun client trouve
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Renseignez les informations du client.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
