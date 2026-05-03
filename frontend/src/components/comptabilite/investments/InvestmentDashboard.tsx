'use client';

import React, { useEffect, useState } from 'react';
import { PortfolioStats } from './PortfolioStats';
import { HoldingsTable } from './HoldingsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  RefreshCcw, 
  Plus, 
  FileText, 
  AlertCircle,
  PieChart as PieChartIcon,
  List as ListIcon
} from 'lucide-react';
import { investmentsService } from '@/shared/api/billing/investments.service';
import type { InvestmentPortfolioSummary, InvestmentPortfolio } from '@/shared/api/billing/types';
import { Badge } from '@/components/ui/badge';

import { CreatePlacementDialog } from '../placements/CreatePlacementDialog';

interface InvestmentDashboardProps {
  portfolioId?: string;
}

export const InvestmentDashboard: React.FC<InvestmentDashboardProps> = ({ portfolioId }) => {
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(portfolioId || null);
  const [summary, setSummary] = useState<InvestmentPortfolioSummary | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Charger les portefeuilles si non fourni
      const pList = await investmentsService.listPortfolios();
      setPortfolios(pList.data);

      const targetId = selectedPortfolioId || pList.data[0]?.id;
      if (targetId) {
        setSelectedPortfolioId(targetId);
        const data = await investmentsService.getPortfolioSummary(targetId);
        if (data.success) {
          setSummary(data.data);
        }
      }
    } catch (error) {
      console.error("Erreur chargement dashboard placements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (data: any) => {
    setIsPending(true);
    try {
      // On utilise le premier portefeuille par défaut si aucun n'est sélectionné
      const portfolioId = selectedPortfolioId || portfolios[0]?.id;
      if (!portfolioId) throw new Error("Aucun portefeuille disponible");

      await investmentsService.recordTransaction({
        portfolioId,
        assetName: data.name,
        assetType: data.type,
        assetClass: data.type, // On utilise le type comme classe par défaut
        transactionType: "BUY",
        tradeDate: data.purchaseDate,
        quantity: data.quantity,
        unitPrice: data.purchasePrice,
        currency: data.currency,
        notes: data.notes
      } as any);
      
      setIsCreateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erreur création placement:", error);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPortfolioId]);

  if (loading && !summary) {
    return <div className="flex items-center justify-center h-64">Chargement du dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion de Portefeuille</h1>
          <p className="text-muted-foreground text-sm">
            Suivi des placements, valorisations et performances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Actualiser
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau Placement
          </Button>
        </div>
      </div>

      <CreatePlacementDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreatePlacement}
        isPending={isPending}
      />

      {summary && (
        <>
          <PortfolioStats summary={summary.summary} />

          <Tabs defaultValue="holdings" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="holdings" className="flex items-center gap-2">
                  <ListIcon className="h-4 w-4" /> Positions
                </TabsTrigger>
                <TabsTrigger value="allocation" className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Allocation
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" /> Historique
                </TabsTrigger>
              </TabsList>

              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase font-bold">Portefeuille:</span>
                <Badge variant="outline" className="bg-white">{summary.portfolio.label}</Badge>
              </div>
            </div>

            <TabsContent value="holdings" className="mt-0">
              <HoldingsTable holdings={summary.holdings} loading={loading} />
            </TabsContent>

            <TabsContent value="allocation" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Répartition par Classe d'Actif</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(summary.byAssetClass).map(([cls, data]) => {
                        const percent = (data.marketValue / summary.summary.totalMarketValue) * 100;
                        return (
                          <div key={cls} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span>{cls}</span>
                              <span>{percent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Alertes Récentes</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm italic">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    Aucune alerte critique détectée.
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-0">
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground italic">
                  Chargement de l'historique des transactions...
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
