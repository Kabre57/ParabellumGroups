'use client';

import React, { useMemo, useState } from 'react';
import { Download, FileText, Pencil, Printer, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMissionOrders, useMarkMissionOrderPrinted } from '@/hooks/useTechnical';
import { MissionOrder, technicalService } from '@/shared/api/technical';
import MissionOrderPrint from '@/components/printComponents/MissionOrderPrint';
import { getCrudVisibility } from '@/shared/action-visibility';
import { useAuth } from '@/shared/hooks/useAuth';
import { EditMissionOrderDialog } from '@/components/technical/EditMissionOrderDialog';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  GENERE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IMPRIME: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ARCHIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function MissionOrdersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [missionFilter, setMissionFilter] = useState('');
  const [technicienFilter, setTechnicienFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MissionOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<MissionOrder | null>(null);

  const { data: orders = [], isLoading } = useMissionOrders({ pageSize: 200 });
  const markPrinted = useMarkMissionOrderPrinted();
  const { canExport, canUpdate } = getCrudVisibility(user, {
    read: ['mission_orders.read'],
    export: ['mission_orders.read', 'mission_orders.print'],
    update: ['mission_orders.update'],
  });

  const missionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          orders
            .filter((order) => order.mission?.id)
            .map((order) => [order.mission!.id, { id: order.mission!.id, label: order.mission?.titre || order.numeroOrdre }]),
        ).values(),
      ),
    [orders],
  );

  const technicienOptions = useMemo(
    () =>
      Array.from(
        new Map(
          orders
            .filter((order) => order.technicien?.id)
            .map((order) => [
              order.technicien!.id,
              {
                id: order.technicien!.id,
                label: [order.technicien?.prenom, order.technicien?.nom].filter(Boolean).join(' ') || order.technicien?.nom || order.numeroOrdre,
              },
            ]),
        ).values(),
      ),
    [orders],
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesMission = !missionFilter || order.mission?.id === missionFilter;
        const matchesTechnicien = !technicienFilter || order.technicien?.id === technicienFilter;
        const orderDate = order.dateDepart ? new Date(order.dateDepart) : null;
        const matchesDateFrom = !dateFrom || (orderDate && orderDate >= new Date(`${dateFrom}T00:00:00`));
        const matchesDateTo = !dateTo || (orderDate && orderDate <= new Date(`${dateTo}T23:59:59`));
        const haystack = [
          order.numeroOrdre,
          order.objetMission,
          order.destination,
          order.technicien?.nom,
          order.technicien?.prenom,
          order.mission?.titre,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return matchesStatus && matchesMission && matchesTechnicien && matchesDateFrom && matchesDateTo && haystack.includes(search.toLowerCase());
      }),
    [orders, search, statusFilter, missionFilter, technicienFilter, dateFrom, dateTo],
  );

  const handlePrint = async (order: MissionOrder) => {
    setSelectedOrder(order);
    if (order.status !== 'IMPRIME') {
      markPrinted.mutate(order.id);
    }
  };

  const handleDownloadPdf = async (order: MissionOrder) => {
    try {
      const blob = await technicalService.downloadPdf(order.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ordre-mission-${order.numeroOrdre}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      queryClient.invalidateQueries({ queryKey: ['mission-orders'] });
      toast.success('PDF telecharge');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Impossible de telecharger le PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedOrder && (
        <MissionOrderPrint
          mission={selectedOrder.mission}
          technicien={selectedOrder.technicien}
          missionOrder={selectedOrder}
          interventionTitle={selectedOrder.intervention?.titre}
          onClose={() => setSelectedOrder(null)}
        />
      )}
      <EditMissionOrderDialog
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ordres de mission</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Historique et reimpression des ordres de mission nominatifs.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="grid gap-4 lg:grid-cols-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un ordre, une mission, un technicien..."
              className="pl-10"
            />
          </div>
          <select
            value={missionFilter}
            onChange={(e) => setMissionFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Toutes les missions</option>
            {missionOptions.map((mission) => (
              <option key={mission.id} value={mission.id}>{mission.label}</option>
            ))}
          </select>
          <select
            value={technicienFilter}
            onChange={(e) => setTechnicienFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Tous les techniciens</option>
            {technicienOptions.map((technicien) => (
              <option key={technicien.id} value={technicien.id}>{technicien.label}</option>
            ))}
          </select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="GENERE">Genere</option>
            <option value="IMPRIME">Imprime</option>
            <option value="ARCHIVE">Archive</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setMissionFilter('');
              setTechnicienFilter('');
              setDateFrom('');
              setDateTo('');
              setStatusFilter('');
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ordre</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Mission / Intervention</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Technicien</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Contenu</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Vehicule</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{order.numeroOrdre}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{order.mission?.titre}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{order.intervention?.titre || order.objetMission}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {[order.technicien?.prenom, order.technicien?.nom].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{order.technicien?.specialite?.nom || '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{order.destination}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{order.objetMission}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{order.vehiculeLabel || order.vehiculeType}</td>
                  <td className="px-4 py-4">
                    <Badge className={statusColors[order.status] || statusColors.GENERE}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Button variant="outline" size="sm" onClick={() => setEditingOrder(order)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                      )}
                      {canExport && (
                        <Button variant="outline" size="sm" onClick={() => handlePrint(order)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimer
                        </Button>
                      )}
                      {canExport && (
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(order)}>
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Aucun ordre de mission pour les filtres actuels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
