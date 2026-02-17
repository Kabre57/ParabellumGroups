'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Search, XCircle } from 'lucide-react';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AuditStatus = 'ok' | 'warning' | 'critical';

interface AuditItem {
  id: string;
  product: string;
  code: string;
  theoreticalStock: number;
  actualStock: number;
  variance: number;
  varianceValue: number;
  lastAudit: string;
  status: AuditStatus;
}

const statusColors: Record<AuditStatus, string> = {
  ok: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

const statusLabels: Record<AuditStatus, string> = {
  ok: 'Conforme',
  warning: 'Attention',
  critical: 'Critique',
};

const statusIcons: Record<AuditStatus, any> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'ALL'>('ALL');
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['inventory-articles', 'audit'],
    queryFn: () => inventoryService.getArticles(),
  });

  const auditItems: AuditItem[] = useMemo(
    () =>
      (stockResponse?.data || []).map((item: InventoryArticle) => ({
        id: item.id,
        product: item.nom,
        code: item.reference || item.id,
        theoreticalStock: item.quantiteStock ?? 0,
        actualStock: item.quantiteStock ?? 0,
        variance: 0,
        varianceValue: 0,
        lastAudit: item.updatedAt || new Date().toISOString(),
        status: (item.quantiteStock ?? 0) === 0 ? 'critical' : 'ok',
      })),
    [stockResponse]
  );

  const filteredAudits = auditItems.filter((item) => {
    const matchesSearch =
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: auditItems.length,
    ok: auditItems.filter((a) => a.status === 'ok').length,
    warning: auditItems.filter((a) => a.status === 'warning').length,
    critical: auditItems.filter((a) => a.status === 'critical').length,
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-gray-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Audit stock</h1>
        </div>
        <Button variant="outline" onClick={() => setComingSoonOpen(true)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Nouvel audit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Conformes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.ok}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="h-4 w-4 text-red-600" />
              Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des audits</CardTitle>
          <CardDescription>Comparaison stock theorique et reel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit..."
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AuditStatus | 'ALL')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ok">Conformes</option>
              <option value="warning">Attention</option>
              <option value="critical">Critiques</option>
            </select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Produit</th>
                    <th className="px-4 py-3 font-medium">Stock theorique</th>
                    <th className="px-4 py-3 font-medium">Stock reel</th>
                    <th className="px-4 py-3 font-medium">Ecart</th>
                    <th className="px-4 py-3 font-medium">Valeur ecart</th>
                    <th className="px-4 py-3 font-medium">Dernier audit</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((item) => {
                    const StatusIcon = statusIcons[item.status];
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{item.code}</td>
                        <td className="px-4 py-3">{item.product}</td>
                        <td className="px-4 py-3">{item.theoreticalStock}</td>
                        <td className="px-4 py-3">{item.actualStock}</td>
                        <td className="px-4 py-3 font-medium">
                          <span className={getVarianceColor(item.variance)}>
                            {item.variance > 0 ? '+' : ''}
                            {item.variance}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={getVarianceColor(item.varianceValue)}>
                            {item.varianceValue > 0 ? '+' : ''}
                            {item.varianceValue.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            F
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(item.lastAudit).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`flex w-fit items-center gap-1 ${statusColors[item.status]}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusLabels[item.status]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAudits.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun audit trouve.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bientot disponible</DialogTitle>
            <DialogDescription>
              La creation et la validation d'audits seront ajoutees prochainement.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
