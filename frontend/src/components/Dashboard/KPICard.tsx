import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  change?: number;
  permission?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  format,
  icon: Icon,
  color,
  bgColor,
  change
}) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'XOF',
          notation: 'compact'
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('fr-FR').format(val);
    }
  };

  const isPositiveChange = change && change > 0;
  const isNegativeChange = change && change < 0;

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-lg ${bgColor} dark:bg-opacity-20`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center text-sm font-medium ${
              isPositiveChange 
                ? 'text-green-600 dark:text-green-400' 
                : isNegativeChange 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {isPositiveChange && <TrendingUp className="h-4 w-4 mr-1" />}
              {isNegativeChange && <TrendingDown className="h-4 w-4 mr-1" />}
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue(value, format)}
          </div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};