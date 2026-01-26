'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import customersService from '@/shared/api/services/customers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import ProspectsList from '@/components/customers/ProspectsList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProspectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['prospect-stats'],
    queryFn: async () => {
      const response = await customersService.getProspectStats();
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Prospects
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez votre pipeline de ventes
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Nouveau prospect
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <div className="col-span-4 flex justify-center py-8">
            <Spinner />
          </div>
        ) : stats ? (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total prospects
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-xl">📊</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Taux de conversion
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.conversionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-xl">📈</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    CA potentiel
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(stats.totalExpectedRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 text-xl">💰</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Deals gagnés
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.wonDeals}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.lostDeals} perdus
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 text-xl">🎯</span>
                </div>
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {/* Pipeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Pipeline de ventes
        </h2>
        <ProspectsList onConvert={() => {
          // Prospect converted successfully
        }} />
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Formulaire de création de prospect à implémenter
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
