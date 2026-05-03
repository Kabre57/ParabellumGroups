'use client';

import React, { useState } from 'react';
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

interface SyscoaReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId?: number;
}

export const SyscoaReportDialog: React.FC<SyscoaReportDialogProps> = ({ open, onOpenChange, enterpriseId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      // Pour la démo, on utilise l'exercice en cours si non sélectionné
      const res = await accountingService.generateSyscoaReport({
        fiscalYearId: 'CURRENT', // Sera résolu par le backend ou l'utilisateur
        enterpriseId
      });
      if (res.success) {
        setResult(res.data);
      }
    } catch (error) {
      console.error("Erreur génération SYSCOA:", error);
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
                <span>Une fois générés, ces rapports seront archivés en tant que snapshots immuables pour l'audit.</span>
              </div>
              <Button onClick={generate} disabled={loading} size="lg" className="w-full">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Lancer la génération"}
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                <span>Rapport SYSCOA généré avec succès !</span>
              </div>
              <div className="text-xs space-y-1">
                <p><strong>ID Snapshot:</strong> {result.id}</p>
                <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => window.open(`/api/billing/accounting/reports/${result.id}/download`, '_blank')}>
                Télécharger le PDF
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
