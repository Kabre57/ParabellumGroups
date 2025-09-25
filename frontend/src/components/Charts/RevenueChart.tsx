import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface RevenueChartProps {
  data: any[];
  showArea?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  showArea = true 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      notation: 'compact'
    }).format(value);
  };

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {formatMonth(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (showArea) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11 }}
            tickFormatter={formatMonth}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            tickFormatter={formatCurrency}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Chiffre d'Affaires"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 11 }}
          tickFormatter={formatMonth}
          className="text-gray-600 dark:text-gray-400"
        />
        <YAxis 
          tick={{ fontSize: 11 }}
          tickFormatter={formatCurrency}
          className="text-gray-600 dark:text-gray-400"
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#3B82F6" 
          strokeWidth={3}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
          name="Chiffre d'Affaires"
        />
        <Line 
          type="monotone" 
          dataKey="target" 
          stroke="#10B981" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="Objectif"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};