'use client';

import type { AccountingEntry, AccountingMovement, AccountingOverview } from '@/shared/api/billing';

const escapeCell = (value: unknown) => {
  const normalized = String(value ?? '');
  if (/[",;\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const currency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

const date = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};

export const exportTreasuryCsv = (movements: AccountingMovement[], fileName = 'tresorerie.csv') => {
  const rows = [
    ['Date', 'Type', 'Categorie', 'Description', 'Montant', 'Solde', 'Reference'],
    ...movements.map((movement) => [
      date(movement.date),
      movement.type === 'income' ? 'Encaissement' : 'Decaissement',
      movement.category,
      movement.description,
      currency(movement.amount),
      currency(movement.balance),
      movement.reference || '',
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\n');
  downloadBlob(csv, fileName, 'text/csv;charset=utf-8');
};

export const exportEntriesCsv = (entries: AccountingEntry[], fileName = 'ecritures-comptables.csv') => {
  const rows = [
    ['Date', 'Numero', 'Journal', 'Compte Debit', 'Compte Credit', 'Libelle', 'Debit', 'Credit', 'Reference'],
    ...entries.map((entry) => [
      date(entry.date),
      entry.entryNumber || entry.id,
      `${entry.journalCode} - ${entry.journalLabel}`,
      `${entry.accountDebit} - ${entry.accountDebitLabel}`,
      `${entry.accountCredit} - ${entry.accountCreditLabel}`,
      entry.label,
      currency(entry.debit),
      currency(entry.credit),
      entry.reference,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\n');
  downloadBlob(csv, fileName, 'text/csv;charset=utf-8');
};

export const exportAccountsCsv = (accounts: AccountingOverview['accounts'], fileName = 'plan-comptable.csv') => {
  const rows = [
    ['Code', 'Libelle', 'Type', 'Solde', 'Description'],
    ...accounts.map((account) => [
      account.code,
      account.label,
      account.type,
      currency(account.balance),
      account.description || '',
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\n');
  downloadBlob(csv, fileName, 'text/csv;charset=utf-8');
};

const buildReportHtml = (title: string, overview: AccountingOverview) => `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { font-size: 28px; margin-bottom: 4px; }
      h2 { font-size: 18px; margin: 24px 0 8px; }
      p { margin: 0 0 12px; color: #4b5563; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
      th { background: #eff6ff; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .card { border: 1px solid #d1d5db; padding: 16px; border-radius: 8px; }
      .amount { text-align: right; font-weight: bold; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>Période: ${overview.period}${overview.startDate ? ` | Du ${date(overview.startDate)}` : ''}${overview.endDate ? ` au ${date(overview.endDate)}` : ''}</p>
    <p>Généré le ${date(overview.generatedAt)}</p>

    <div class="grid">
      <div class="card">
        <h2>Bilan simplifié</h2>
        <table>
          <tr><th>Indicateur</th><th>Montant</th></tr>
          <tr><td>Total actif</td><td class="amount">${currency(overview.reports.balanceSheet.totalAssets)}</td></tr>
          <tr><td>Total passif</td><td class="amount">${currency(overview.reports.balanceSheet.totalLiabilities)}</td></tr>
          <tr><td>Capitaux propres</td><td class="amount">${currency(overview.reports.balanceSheet.totalEquity)}</td></tr>
        </table>
      </div>
      <div class="card">
        <h2>Résultat</h2>
        <table>
          <tr><th>Indicateur</th><th>Montant</th></tr>
          <tr><td>Total produits</td><td class="amount">${currency(overview.reports.incomeStatement.totalRevenue)}</td></tr>
          <tr><td>Total charges</td><td class="amount">${currency(overview.reports.incomeStatement.totalExpenses)}</td></tr>
          <tr><td>Résultat net</td><td class="amount">${currency(overview.reports.incomeStatement.netResult)}</td></tr>
        </table>
      </div>
    </div>

    <h2>Plan comptable</h2>
    <table>
      <tr><th>Code</th><th>Libellé</th><th>Type</th><th>Solde</th></tr>
      ${overview.accounts
        .map(
          (account) =>
            `<tr><td>${account.code}</td><td>${account.label}</td><td>${account.type}</td><td class="amount">${currency(account.balance)}</td></tr>`
        )
        .join('')}
    </table>

    <h2>Écritures récentes</h2>
    <table>
      <tr><th>Date</th><th>Journal</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Référence</th></tr>
      ${overview.entries
        .slice(0, 25)
        .map(
          (entry) =>
            `<tr><td>${date(entry.date)}</td><td>${entry.journalCode}</td><td>${entry.label}</td><td class="amount">${currency(
              entry.debit
            )}</td><td class="amount">${currency(entry.credit)}</td><td>${entry.reference}</td></tr>`
        )
        .join('')}
    </table>
  </body>
</html>
`;

export const printAccountingReport = (title: string, overview: AccountingOverview) => {
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!reportWindow) {
    return;
  }

  reportWindow.document.write(buildReportHtml(title, overview));
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
};
