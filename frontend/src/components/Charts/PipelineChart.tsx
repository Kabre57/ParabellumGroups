import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface PipelineChartProps {
  data: any[];
}

const STAGE_COLORS = {
  'Prospection': '#EF4444',
  'Qualification': '#F59E0B', 
  'Proposition': '#3B82F6',
  'Négociation': '#8B5CF6',
  'Signature': '#10B981'
};

export const PipelineChart: React.FC<PipelineChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      notation: 'compact'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Opportunités: {data.count}
            </p>
            <p className="text-sm text-green-600">
              Valeur: {formatCurrency(data.value)}
            </p>
            <p className="text-sm text-purple-600">
              Taux de conversion: {data.conversionRate}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="stage" 
            tick={{ fontSize: 11 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickFormatter={formatCurrency}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STAGE_COLORS[entry.stage as keyof typeof STAGE_COLORS] || '#3B82F6'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Métriques du pipeline */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.reduce((sum, stage) => sum + stage.count, 0)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Opportunités</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.length > 0 ? (data.reduce((sum, stage) => sum + stage.conversionRate, 0) / data.length).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Taux Moyen</div>
        </div>
      </div>
    </div>
  );
};