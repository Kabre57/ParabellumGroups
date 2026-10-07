'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import billingService, { type AccountingAccountImportPreview } from '@/shared/api/billing';
import { accountingAccountTypeLabel } from './accountingFormat';

interface ImportAccountingAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId?: string | number | null;
  enterpriseName?: string | null;
  onImported?: () => void;
}

const getRequestErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const statusLabel = (status: AccountingAccountImportPreview['rows'][number]['status']) => {
  if (status === 'IMPORTABLE') return 'À importer';
  if (status === 'EXISTING') return 'Déjà présent';
  return 'À corriger';
};

export function ImportAccountingAccountsDialog({
  open,
  onOpenChange,
  enterpriseId,
  enterpriseName,
  onImported,
}: ImportAccountingAccountsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentEnterpriseId = useRef(enterpriseId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AccountingAccountImportPreview | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  currentEnterpriseId.current = enterpriseId;

  useEffect(() => {
    currentEnterpriseId.current = enterpriseId;
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [enterpriseId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    onOpenChange(nextOpen);
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await billingService.getAccountingAccountImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'modele-plan-comptable.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, 'Impossible de télécharger le modèle Excel.'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (selectedFile?: File) => {
    setPreview(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setFile(null);
      toast.error('Choisissez un fichier Excel .xlsx ou .xls.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      toast.error('Le fichier Excel ne doit pas dépasser 5 Mo.');
      return;
    }
    setFile(selectedFile);
  };

  const handlePreview = async () => {
    if (!file || !enterpriseId) return;
    const previewEnterpriseId = enterpriseId;
    setIsPreviewing(true);
    try {
      const response = await billingService.previewAccountingAccountImport(file);
      if (String(currentEnterpriseId.current) === String(previewEnterpriseId)) {
        setPreview(response.data);
      }
    } catch (error) {
      toast.error(getRequestErrorMessage(error, 'Impossible de lire ce fichier Excel.'));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !enterpriseId || !preview?.summary.importable) return;
    setIsImporting(true);
    try {
      const response = await billingService.importAccountingAccounts(file, preview.enterpriseId);
      const result = response.data;
      toast.success(
        `${result.imported} compte(s) ajouté(s), ${result.skippedExisting} déjà présent(s), ${result.skippedInvalid} ligne(s) à corriger.`
      );
      onImported?.();
      handleOpenChange(false);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, 'Erreur lors de l’import du plan comptable.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importer un plan comptable Excel</DialogTitle>
          <DialogDescription>
            Téléchargez le modèle, complétez-le, puis vérifiez l’aperçu avant d’ajouter les comptes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Les comptes seront importés dans l’entreprise active : <strong>{enterpriseName || 'aucune entreprise sélectionnée'}</strong>.
            Les codes déjà présents seront ignorés. Aucun compte existant ne sera remplacé ou supprimé.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate} disabled={isDownloading}>
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? 'Préparation…' : 'Télécharger le modèle Excel'}
            </Button>
            <span className="text-sm text-muted-foreground">Colonnes : Code, Libellé, Type, Description, Solde initial.</span>
          </div>

          <div className="space-y-2">
            <label htmlFor="account-plan-excel" className="text-sm font-medium">Fichier Excel (.xlsx ou .xls, 5 Mo maximum)</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={fileInputRef}
                id="account-plan-excel"
                type="file"
                accept=".xlsx,.xls"
                className="block min-h-10 flex-1 rounded-md border border-input px-3 py-2 text-sm"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={handlePreview} disabled={!file || !enterpriseId || isPreviewing || isImporting}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isPreviewing ? 'Vérification…' : 'Vérifier le fichier'}
              </Button>
            </div>
          </div>

          {!enterpriseId && <p className="text-sm text-amber-700">Sélectionnez d’abord une entreprise active.</p>}

          {preview && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-4">
                <SummaryCard label="Lignes" value={preview.summary.total} />
                <SummaryCard label="Importables" value={preview.summary.importable} tone="green" />
                <SummaryCard label="Déjà présents" value={preview.summary.existing} tone="blue" />
                <SummaryCard label="À corriger" value={preview.summary.invalid} tone={preview.summary.invalid ? 'amber' : 'green'} />
              </div>

              {preview.summary.invalid > 0 && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Les lignes invalides seront laissées de côté. Corrigez-les dans Excel puis sélectionnez à nouveau le fichier si vous souhaitez les importer.
                </div>
              )}

              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Ligne</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Résultat</th>
                      <th className="px-3 py-2">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={`${row.line}-${row.code}-${index}`} className="border-t align-top">
                        <td className="px-3 py-2">{row.line}</td>
                        <td className="px-3 py-2 font-medium">{row.code || '—'}</td>
                        <td className="px-3 py-2">{row.label || '—'}</td>
                        <td className="px-3 py-2">{row.type ? accountingAccountTypeLabel(row.type.toLowerCase()) : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 ${row.status === 'IMPORTABLE' ? 'text-emerald-700' : row.status === 'EXISTING' ? 'text-blue-700' : 'text-amber-800'}`}>
                            {row.status === 'IMPORTABLE' ? <CheckCircle2 className="h-4 w-4" /> : row.status === 'EXISTING' ? <AlertCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="max-w-xs px-3 py-2 text-muted-foreground">{row.errors.join(' ') || (row.status === 'EXISTING' ? 'Ce code existe déjà dans cette entreprise.' : '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            Annuler
          </Button>
          <Button type="button" onClick={handleImport} disabled={!preview?.summary.importable || isImporting || isPreviewing}>
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? 'Import en cours…' : `Importer ${preview?.summary.importable ?? 0} compte(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'green' | 'blue' | 'amber' }) {
  const colors = {
    slate: 'border-slate-200 bg-white text-slate-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${colors[tone]}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
