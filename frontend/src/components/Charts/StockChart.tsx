import React from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';

interface StockChartProps {
  data: any[];
}

export const StockChart: React.FC<StockChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Aucune alerte de stock
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((item, index) => {
        const stockPercentage = (item.currentStock / item.maxStock) * 100;
        const isLow = stockPercentage <= 20;
        const isCritical = stockPercentage <= 10;
        
        return (
          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {isCritical ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isLow ? (
                  <TrendingDown className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Package className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.currentStock} / {item.maxStock}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCritical 
                    ? 'bg-red-500' 
                    : isLow 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.max(stockPercentage, 5)}%` }}
              />
            </div>
            
            <div className="flex justify-between mt-1">
              <span className={`text-xs font-medium ${
                isCritical 
                  ? 'text-red-600 dark:text-red-400' 
                  : isLow 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {stockPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                SKU: {item.sku}
              </span>
            </div>
          </div>
        );
      })}
      
      {data.length > 5 && (
        <div className="text-center pt-2">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Voir toutes les alertes ({data.length})
          </button>
        </div>
      )}
    </div>
  );
};