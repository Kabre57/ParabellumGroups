'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Search, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

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
  ok: 'bg-green-200 text-green-800',
  warning: 'bg-yellow-200 text-yellow-800',
  critical: 'bg-red-200 text-red-800',
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

const mockAuditData: AuditItem[] = [
  { id: '1', product: 'Ordinateur portable Dell XPS', code: 'PROD-001', theoreticalStock: 45, actualStock: 45, variance: 0, varianceValue: 0, lastAudit: '2026-01-15', status: 'ok' },
  { id: '2', product: 'Bureau ergonomique réglable', code: 'PROD-002', theoreticalStock: 12, actualStock: 10, variance: -2, varianceValue: -900, lastAudit: '2026-01-18', status: 'warning' },
  { id: '3', product: 'Chaise de bureau Herman Miller', code: 'PROD-003', theoreticalStock: 8, actualStock: 8, variance: 0, varianceValue: 0, lastAudit: '2026-01-20', status: 'ok' },
  { id: '4', product: 'Écran Dell 27 pouces', code: 'PROD-004', theoreticalStock: 23, actualStock: 18, variance: -5, varianceValue: -1750, lastAudit: '2026-01-14', status: 'critical' },
  { id: '5', product: 'Clavier mécanique Logitech', code: 'PROD-005', theoreticalStock: 67, actualStock: 69, variance: 2, varianceValue: 179.98, lastAudit: '2026-01-19', status: 'ok' },
  { id: '6', product: 'Papier A4 (ramette)', code: 'PROD-007', theoreticalStock: 234, actualStock: 220, variance: -14, varianceValue: -77, lastAudit: '2026-01-16', status: 'warning' },
  { id: '7', product: 'Stylos BIC bleus (boîte de 50)', code: 'PROD-008', theoreticalStock: 89, actualStock: 89, variance: 0, varianceValue: 0, lastAudit: '2026-01-21', status: 'ok' },
  { id: '8', product: 'Souris sans fil', code: 'PROD-006', theoreticalStock: 0, actualStock: 3, variance: 3, varianceValue: 105, lastAudit: '2026-01-12', status: 'warning' },
];

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'ALL'>('ALL');

  const { data: auditItems = mockAuditData, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockAuditData;
    },
  });

  const filteredAudits = auditItems.filter((item: AuditItem) => {
    const matchesSearch = 
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: auditItems.length,
    ok: auditItems.filter((a: AuditItem) => a.status === 'ok').length,
    warning: auditItems.filter((a: AuditItem) => a.status === 'warning').length,
    critical: auditItems.filter((a: AuditItem) => a.status === 'critical').length,
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-gray-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <a href="/dashboard/achats" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Retour aux achats
          </a>
          <h1 className="text-3xl font-bold mt-1">Audit Stock</h1>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Nouveau audit
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Audits</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Conformes
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Attention
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <XCircle className="w-4 h-4 text-red-600" />
            Critiques
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AuditStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ok">Conformes</option>
              <option value="warning">Attention</option>
              <option value="critical">Critiques</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Théorique</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Réel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Écart</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valeur Écart</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernier Audit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAudits.map((item: AuditItem) => {
                  const StatusIcon = statusIcons[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.product}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.theoreticalStock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.actualStock}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <span className={getVarianceColor(item.variance)}>
                          {item.variance > 0 ? '+' : ''}{item.variance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <span className={getVarianceColor(item.varianceValue)}>
                          {item.varianceValue > 0 ? '+' : ''}{item.varianceValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} F
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(item.lastAudit).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusColors[item.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredAudits.length === 0 && (
              <div className="text-center py-8 text-gray-500">Aucun audit trouvé</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
