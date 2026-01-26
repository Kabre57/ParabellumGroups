'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';

export default function RapportsPage() {
  const [period, setPeriod] = useState('month');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rapports Financiers</h1>
          <p className="text-muted-foreground mt-2">
            Bilans, comptes de résultat et analyses financières
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <Button size="sm" variant="outline">
              <Download className="h-3 w-3" />
            </Button>
          </div>
          <h3 className="font-semibold mb-1">Bilan Comptable</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Actifs / Passifs</p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <Button size="sm" variant="outline">
              <Download className="h-3 w-3" />
            </Button>
          </div>
          <h3 className="font-semibold mb-1">Compte de Résultat</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Produits / Charges</p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            <Button size="sm" variant="outline">
              <Download className="h-3 w-3" />
            </Button>
          </div>
          <h3 className="font-semibold mb-1">Tableau de Trésorerie</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Flux de trésorerie</p>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <FileText className="h-8 w-8 text-orange-500" />
            <Button size="sm" variant="outline">
              <Download className="h-3 w-3" />
            </Button>
          </div>
          <h3 className="font-semibold mb-1">Analyse Financière</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">Ratios & KPIs</p>
        </Card>
      </div>

      {/* Bilan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Actif (Assets)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Actifs Immobilisés</span>
              <span className="font-bold text-blue-600">125 000F</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Actifs Circulants</span>
              <span className="font-bold text-blue-600">332 000F</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
              <span className="font-bold">TOTAL ACTIF</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">457 000F</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Passif (Liabilities)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Capitaux Propres</span>
              <span className="font-bold text-green-600">250 000F</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="font-medium">Dettes</span>
              <span className="font-bold text-red-600">207 000F</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded">
              <span className="font-bold">TOTAL PASSIF</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">457 000F</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Compte de Résultat */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Compte de Résultat (Période: {period === 'month' ? 'Ce mois' : period === 'quarter' ? 'Ce trimestre' : 'Cette année'})
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">PRODUITS</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Prestations de services</span>
                <span className="font-semibold text-green-600">320 000F</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Autres produits</span>
                <span className="font-semibold text-green-600">15 000F</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                <span className="font-bold">Total Produits</span>
                <span className="font-bold text-green-700 dark:text-green-400">335 000F</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">CHARGES</h3>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Salaires et charges sociales</span>
                <span className="font-semibold text-red-600">180 000F</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Achats et fournitures</span>
                <span className="font-semibold text-red-600">45 000F</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>Charges externes</span>
                <span className="font-semibold text-red-600">35 000F</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                <span className="font-bold">Total Charges</span>
                <span className="font-bold text-red-700 dark:text-red-400">260 000F</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
            <span className="text-lg font-bold">RÉSULTAT NET</span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">75 000F</span>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Marge Nette</p>
              <p className="text-2xl font-bold text-green-600">22.4%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux d'Endettement</p>
              <p className="text-2xl font-bold text-orange-600">45.3%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ROE (Return on Equity)</p>
              <p className="text-2xl font-bold text-blue-600">30%</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}
