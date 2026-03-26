const formatDate = (value) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildLine = (code, label, base, unit, gains, deductions) => ({
  code,
  label,
  base,
  unit,
  gains,
  deductions,
});

const getPayrollPdfStyles = () => `
  body { font-family: Arial, sans-serif; margin: 18px; color: #101828; }
  .document { border: 1px solid #222; }
  .header-title { text-align: center; font-size: 22px; font-weight: 700; padding: 8px 0; border-bottom: 1px solid #222; }
  .header-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; border-bottom: 1px solid #222; }
  .company-box, .bulletin-box { padding: 10px 12px; min-height: 104px; }
  .company-box { border-right: 1px solid #222; }
  .bulletin-box { text-align: center; }
  .muted { color: #475467; font-size: 12px; }
  .top-meta { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #222; }
  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table td { padding: 4px 8px; font-size: 12px; vertical-align: top; }
  .meta-table td:first-child { color: #475467; width: 40%; }
  .payroll-table { width: 100%; border-collapse: collapse; }
  .payroll-table th, .payroll-table td { border: 1px solid #222; padding: 4px 6px; font-size: 11px; }
  .payroll-table th { background: #f3f4f6; font-weight: 700; }
  .right { text-align: right; }
  .center { text-align: center; }
  .totals-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; border-top: 1px solid #222; }
  .left-summary, .right-summary { padding: 10px 12px; min-height: 90px; }
  .left-summary { border-right: 1px solid #222; }
  .summary-line { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; font-size: 12px; }
  .summary-line strong { font-size: 13px; }
  .signature { border-top: 1px solid #222; margin-top: 16px; padding-top: 18px; text-align: right; font-size: 12px; }
  .footer-grid { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #222; }
  .footer-box { padding: 10px 12px; min-height: 86px; }
  .footer-box:first-child { border-right: 1px solid #222; }
  .footer-title { font-size: 11px; font-weight: 700; margin-bottom: 6px; color: #344054; text-transform: uppercase; }
  .page-break { page-break-after: always; break-after: page; margin-bottom: 18px; }
  .batch-title { font-size: 18px; font-weight: 700; margin-bottom: 14px; }
`;

const buildPayrollDocumentMarkup = ({
  company,
  payroll,
  contract,
  cumulative,
}) => {
  const breakdown = payroll.details?.breakdown || {};
  const employee = payroll.employe || {};
  const periodLabel = payroll.periode || `${payroll.mois}/${payroll.annee}`;

  const lines = [
    buildLine('100', 'SALAIRE DE BASE', payroll.baseSalaire, contract?.heuresHebdo || 173, payroll.baseSalaire, 0),
    buildLine('110', 'PRIMES', payroll.primes, 0, payroll.primes, 0),
    buildLine('120', 'INDÉMNITÉS', payroll.indemnite, 0, payroll.indemnite, 0),
    buildLine('130', 'HEURES SUPPLÉMENTAIRES', payroll.heuresSup, 0, payroll.heuresSup, 0),
    buildLine('600', 'IMPÔT SUR SALAIRES', 0, 0, 0, breakdown.isAmount || 0),
    buildLine('610', 'C.N.', 0, 0, 0, breakdown.asAmount || 0),
    buildLine('620', 'I.G.R', payroll.netImposable, 0, 0, payroll.igr),
    buildLine('630', 'C.N.P.S', payroll.baseSalaire, `${formatNumber((Number(payroll.cnpsATUtilise || 0) || 0) * 100, 2)}%`, 0, payroll.cnpsSalarial),
    buildLine('640', 'C.M.U / C.N.A.M', 0, 0, 0, breakdown.cnam?.salarial || payroll.cnam || 0),
    buildLine('800', 'RETENUES DIVERSES', 0, 0, 0, payroll.autresRetenues || 0),
  ].filter((line) => Number(line.gains || 0) !== 0 || Number(line.deductions || 0) !== 0 || line.code === '100');

  const gainsSubtotal = lines.reduce((sum, line) => sum + Number(line.gains || 0), 0);
  const deductionsSubtotal = lines.reduce((sum, line) => sum + Number(line.deductions || 0), 0);

  const companyName = company.name || 'PARABELLUM GROUPS';
  const companyAddress = [company.address, company.city, company.country].filter(Boolean).join(' ');

  return `
        <div class="document">
          <div class="header-title">${escapeHtml(companyName)}</div>

          <div class="header-grid">
            <div class="company-box">
              <div><strong>${escapeHtml(company.zone || 'Zone industrielle')}</strong></div>
              <div class="muted">${escapeHtml(companyAddress || 'Abidjan')}</div>
              <div class="muted">RCCM: ${escapeHtml(company.rccm || '-')}</div>
              <div class="muted">Compte contribuable: ${escapeHtml(company.taxId || '-')}</div>
            </div>
            <div class="bulletin-box">
              <div style="font-size:18px;font-weight:700;">BULLETIN DE PAIE</div>
              <div class="muted">${escapeHtml(periodLabel)}</div>
            </div>
          </div>

          <div class="top-meta">
            <div style="border-right: 1px solid #222; padding: 8px 0;">
              <table class="meta-table">
                <tr><td>Affectation</td><td><strong>${escapeHtml(contract?.departement || employee.departement || '-')}</strong></td></tr>
                <tr><td>Service</td><td><strong>${escapeHtml(contract?.departement || employee.departement || '-')}</strong></td></tr>
                <tr><td>Fonction</td><td><strong>${escapeHtml(contract?.poste || employee.poste || '-')}</strong></td></tr>
                <tr><td>Catégorie</td><td><strong>${escapeHtml(contract?.type || employee.categorie || 'Employé')}</strong></td></tr>
              </table>
            </div>
            <div style="padding: 8px 0;">
              <table class="meta-table">
                <tr><td>Nom et Prénoms</td><td><strong>${escapeHtml(`${employee.prenom || ''} ${employee.nom || ''}`.trim() || '-')}</strong></td></tr>
                <tr><td>Matricule</td><td><strong>${escapeHtml(employee.matricule || '-')}</strong></td></tr>
                <tr><td>Parts fiscales</td><td><strong>${escapeHtml(payroll.partsFiscales || employee.partsFiscales || 1)}</strong></td></tr>
                <tr><td>Date d'embauche</td><td><strong>${escapeHtml(formatDate(contract?.dateDebut || employee.dateEmbauche))}</strong></td></tr>
                <tr><td>N° CNPS</td><td><strong>${escapeHtml(employee.cnpsNumber || '-')}</strong></td></tr>
                <tr><td>Salarié</td><td><strong>Mensuel</strong></td></tr>
              </table>
            </div>
          </div>

          <table class="payroll-table">
            <thead>
              <tr>
                <th class="center">Codes</th>
                <th>Libellés</th>
                <th class="right">Bases</th>
                <th class="center">HR/JR</th>
                <th class="right">Gains</th>
                <th class="right">Retenues</th>
              </tr>
            </thead>
            <tbody>
              ${lines
                .map(
                  (line) => `
                    <tr>
                      <td class="center">${escapeHtml(line.code)}</td>
                      <td>${escapeHtml(line.label)}</td>
                      <td class="right">${formatNumber(line.base)}</td>
                      <td class="center">${escapeHtml(line.unit || 0)}</td>
                      <td class="right">${formatNumber(line.gains)}</td>
                      <td class="right">${formatNumber(line.deductions)}</td>
                    </tr>
                  `
                )
                .join('')}
              <tr>
                <td colspan="4" class="right"><strong>Sous totaux</strong></td>
                <td class="right"><strong>${formatNumber(gainsSubtotal)}</strong></td>
                <td class="right"><strong>${formatNumber(deductionsSubtotal)}</strong></td>
              </tr>
              <tr>
                <td colspan="4" class="right"><strong>Salaire net</strong></td>
                <td colspan="2" class="right"><strong>${formatNumber(payroll.netAPayer)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="totals-grid">
            <div class="left-summary">
              <div class="summary-line"><span>Brut imposable</span><strong>${formatNumber(payroll.brut)}</strong></div>
              <div class="summary-line"><span>Net imposable</span><strong>${formatNumber(payroll.netImposable)}</strong></div>
              <div class="summary-line"><span>Total cotisations salariales</span><strong>${formatNumber(payroll.cotisationsSalariales)}</strong></div>
              <div class="summary-line"><span>Total retenues</span><strong>${formatNumber(deductionsSubtotal)}</strong></div>
              <div class="summary-line"><span>Net à payer</span><strong>${formatNumber(payroll.netAPayer)}</strong></div>
            </div>
            <div class="right-summary">
              <div class="summary-line"><span>Base CNPS</span><strong>${formatNumber(payroll.baseSalaire)}</strong></div>
              <div class="summary-line"><span>Cotisation retraite</span><strong>${formatNumber(payroll.cnpsSalarial)}</strong></div>
              <div class="summary-line"><span>CMU / CNAM</span><strong>${formatNumber(breakdown.cnam?.salarial || payroll.cnam || 0)}</strong></div>
              <div class="summary-line"><span>IGR</span><strong>${formatNumber(payroll.igr)}</strong></div>
              <div class="signature">Signature</div>
            </div>
          </div>

          <div class="footer-grid">
            <div class="footer-box">
              <div class="footer-title">Récapitulatif période</div>
              <div class="summary-line"><span>Début contrat</span><span>${formatDate(contract?.dateDebut || employee.dateEmbauche)}</span></div>
              <div class="summary-line"><span>Heures hebdomadaires</span><span>${escapeHtml(contract?.heuresHebdo || 40)}</span></div>
              <div class="summary-line"><span>Devise</span><span>${escapeHtml(payroll.devise || 'XOF')}</span></div>
            </div>
            <div class="footer-box">
              <div class="footer-title">Cumul ${escapeHtml(payroll.annee)}</div>
              <div class="summary-line"><span>Brut cumulé</span><span>${formatNumber(cumulative.gross)}</span></div>
              <div class="summary-line"><span>Net imposable cumulé</span><span>${formatNumber(cumulative.taxable)}</span></div>
              <div class="summary-line"><span>Impôt cumulé</span><span>${formatNumber(cumulative.tax)}</span></div>
              <div class="summary-line"><span>Net cumulé</span><span>${formatNumber(cumulative.net)}</span></div>
            </div>
          </div>
        </div>
  `;
};

const buildPayrollPdfHtml = (payload) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${getPayrollPdfStyles()}</style>
    </head>
    <body>
      ${buildPayrollDocumentMarkup(payload)}
    </body>
  </html>
`;

const buildGroupedPayrollPdfHtml = ({ title, documents }) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${getPayrollPdfStyles()}</style>
    </head>
    <body>
      ${title ? `<div class="batch-title">${escapeHtml(title)}</div>` : ''}
      ${documents
        .map(
          (document, index) => `
            <div class="${index < documents.length - 1 ? 'page-break' : ''}">
              ${buildPayrollDocumentMarkup(document)}
            </div>
          `
        )
        .join('')}
    </body>
  </html>
`;

module.exports = {
  buildPayrollPdfHtml,
  buildGroupedPayrollPdfHtml,
  formatDate,
  formatNumber,
};
