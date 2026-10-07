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
import { formatCurrency, formatDate } from '@/shared/utils/format';

import { CreatePlacementDialog } from '../placements/CreatePlacementDialog';

interface InvestmentDashboardProps {
  portfolioId?: string;
  scope?: { enterpriseId?: string | number; enterpriseScope?: 'consolidated'; scopeKey?: string; isReady?: boolean; isConsolidated?: boolean };
}

export const InvestmentDashboard: React.FC<InvestmentDashboardProps> = ({ portfolioId, scope }) => {
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(portfolioId || null);
  const [summary, setSummary] = useState<InvestmentPortfolioSummary | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    if (!scope?.isReady) {
      setPortfolios([]);
      setSelectedPortfolioId(null);
      setSummary(null);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSummary(null);
    setTransactions([]);
    try {
      // 1. Charger les portefeuilles si non fourni
      const pList = await investmentsService.listPortfolios({
        enterpriseId: scope?.enterpriseId,
        enterpriseScope: scope?.enterpriseScope,
      });
      setPortfolios(pList.data);

      const targetId = pList.data.some((portfolio) => portfolio.id === selectedPortfolioId)
        ? selectedPortfolioId
        : pList.data[0]?.id;
      if (targetId) {
        setSelectedPortfolioId(targetId);
        const readScope = { enterpriseId: scope?.enterpriseId, enterpriseScope: scope?.enterpriseScope };
        const data = await investmentsService.getPortfolioSummary(targetId, readScope);
        if (data.success) {
          setSummary(data.data);
        }
        const history = await investmentsService.listTransactions({ portfolioId: targetId, ...readScope });
        setTransactions(history.data || []);
      } else {
        setSummary(null);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Erreur chargement dashboard placements:", error);
      setErrorMessage("Impossible de charger les placements. Vérifiez vos droits et la connexion au service.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (data: any) => {
    if (scope?.isConsolidated) return;
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
      await loadData();
    } catch (error) {
      console.error("Erreur création placement:", error);
      setErrorMessage("Impossible d'enregistrer le placement. Vérifiez les données et le portefeuille sélectionné.");
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPortfolioId, scope?.enterpriseId, scope?.enterpriseScope, scope?.scopeKey]);

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
          {portfolios.length > 1 && <select aria-label="Choisir un portefeuille" className="h-9 rounded-md border bg-background px-3 text-sm" value={selectedPortfolioId || ''} onChange={(event) => setSelectedPortfolioId(event.target.value)}>{portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.label}</option>)}</select>}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Actualiser
          </Button>
          {!scope?.isConsolidated && (
            <Button size="sm" disabled={!scope?.isReady || loading} onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau Placement
            </Button>
          )}
        </div>
      </div>

      {errorMessage && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}

      <CreatePlacementDialog 
        open={isCreateDialogOpen && !scope?.isConsolidated}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreatePlacement}
        isPending={isPending}
      />

      {!summary && !loading && <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun portefeuille de placement n'est disponible pour votre entreprise.</CardContent></Card>}

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
                        const percent = summary.summary.totalMarketValue > 0 ? (data.marketValue / summary.summary.totalMarketValue) * 100 : 0;
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
              <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30 text-left"><th className="p-3">Date</th><th className="p-3">Opération</th><th className="p-3">Actif</th><th className="p-3 text-right">Quantité</th><th className="p-3 text-right">Montant net</th><th className="p-3">Statut</th><th className="p-3">Référence</th></tr></thead><tbody>{transactions.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune transaction dans ce portefeuille.</td></tr> : transactions.map((transaction) => <tr className="border-b last:border-0" key={transaction.id}><td className="p-3">{formatDate(transaction.tradeDate)}</td><td className="p-3">{transaction.transactionType}</td><td className="p-3">{transaction.asset?.label || transaction.assetId}</td><td className="p-3 text-right">{Number(transaction.quantity).toLocaleString('fr-FR')}</td><td className="p-3 text-right">{formatCurrency(Number(transaction.netAmount || 0), transaction.currency || 'XOF')}</td><td className="p-3">{transaction.status}</td><td className="p-3">{transaction.reference || '—'}</td></tr>)}</tbody></table></CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
