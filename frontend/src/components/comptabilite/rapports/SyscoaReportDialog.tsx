'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileCheck, AlertTriangle } from 'lucide-react';
import { accountingService } from '@/shared/api/billing/accounting.service';
import type { FiscalYear } from '@/shared/api/billing/types';

interface SyscoaReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId?: number;
}

export const SyscoaReportDialog: React.FC<SyscoaReportDialogProps> = ({ open, onOpenChange, enterpriseId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setErrorMessage('');
    accountingService.getFiscalYears().then(({ data }) => {
      setFiscalYears(data || []);
      const current = (data || []).find((year) => new Date(year.startDate).getFullYear() === new Date().getFullYear());
      setFiscalYearId(current?.id || data?.[0]?.id || '');
    }).catch(() => setErrorMessage("Impossible de charger les exercices comptables."));
  }, [open]);

  const generate = async () => {
    setLoading(true);
    try {
      setErrorMessage('');
      const res = await accountingService.generateSyscoaReport({
        fiscalYearId,
        enterpriseId
      });
      if (res.success) {
        setResult(res.data);
      } else {
        setErrorMessage("Le service n'a pas généré l'aperçu.");
      }
    } catch (error) {
      console.error("Erreur génération SYSCOA:", error);
      setErrorMessage("La génération a échoué. Vérifiez vos droits et les écritures de l'exercice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-indigo-600" />
            Génération États SYSCOA
          </DialogTitle>
          <DialogDescription>
            Cette opération va générer les tableaux réglementaires (Bilan, Compte de Résultat, TFT) basés sur les écritures validées.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          {!result ? (
            <div className="text-center space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Le service produit un aperçu simplifié. Il ne constitue pas un état réglementaire SYSCOHADA complet et ne doit pas être transmis comme déclaration officielle.</span>
          </div>
              <label className="block text-left text-sm font-medium">Exercice comptable<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={fiscalYearId} onChange={(event) => setFiscalYearId(event.target.value)}><option value="">Choisir un exercice</option>{fiscalYears.map((year) => <option key={year.id} value={year.id}>{year.label} ({new Date(year.startDate).getFullYear()}–{new Date(year.endDate).getFullYear()})</option>)}</select></label>
              <Button onClick={generate} disabled={loading || !fiscalYearId} size="lg" className="w-full">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Lancer la génération"}
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                <span>Aperçu comptable généré. À faire vérifier avant tout usage externe.</span>
              </div>
              <div className="text-xs space-y-1">
                <p><strong>ID Snapshot:</strong> {result.snapshotId || result.id || 'non retourné'}</p>
                <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
              </div>
              <pre className="max-h-56 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(result.reportData || result, null, 2)}</pre>
            </div>
          )}
        </div>
        {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
