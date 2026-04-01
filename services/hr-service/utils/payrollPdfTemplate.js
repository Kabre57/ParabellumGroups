// payrollPdfTemplate.js - Version corrigée

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
  } catch (error) {
    console.error('formatDate error:', error);
    return '-';
  }
};

const formatNumber = (value, digits = 0) => {
  try {
    let num = value;
    if (typeof value === 'string') {
      // Nettoyer la chaîne (enlever les espaces, remplacer virgule par point)
      num = value.replace(/\s/g, '').replace(',', '.');
    }
    const number = Number(num);
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(number);
  } catch (error) {
    console.error('formatNumber error:', error);
    return '0';
  }
};

const escapeHtml = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const buildLine = (code, label, base, unit, gains, deductions) => ({
  code: String(code || ''),
  label: String(label || ''),
  base: Number(base || 0),
  unit: String(unit || '0'),
  gains: Number(gains || 0),
  deductions: Number(deductions || 0),
});

const getPayrollPdfStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    margin: 18px; 
    color: #101828; 
    background: white;
    font-size: 12px;
  }
  .document { 
    border: 1px solid #222; 
    background: white;
    margin-bottom: 20px;
  }
  .header-title { 
    text-align: center; 
    font-size: 22px; 
    font-weight: 700; 
    padding: 12px 0; 
    border-bottom: 1px solid #222; 
    background: #f9fafb;
  }
  .header-grid { 
    display: grid; 
    grid-template-columns: 1.2fr 0.8fr; 
    border-bottom: 1px solid #222; 
  }
  .company-box, .bulletin-box { 
    padding: 12px 16px; 
    min-height: 120px; 
  }
  .company-box { 
    border-right: 1px solid #222; 
    background: #fefce8;
  }
  .bulletin-box { 
    text-align: center; 
    background: #f0f9ff;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .muted { 
    color: #475467; 
    font-size: 11px; 
  }
  .top-meta { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    border-bottom: 1px solid #222; 
  }
  .meta-table { 
    width: 100%; 
    border-collapse: collapse; 
  }
  .meta-table td { 
    padding: 6px 10px; 
    font-size: 11px; 
    vertical-align: top; 
    border-bottom: 1px solid #e5e7eb;
  }
  .meta-table td:first-child { 
    color: #475467; 
    width: 40%; 
    font-weight: 500;
  }
  .meta-table td:last-child { 
    font-weight: 600;
  }
  .payroll-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 8px 0;
  }
  .payroll-table th, 
  .payroll-table td { 
    border: 1px solid #222; 
    padding: 6px 8px; 
    font-size: 10px; 
  }
  .payroll-table th { 
    background: #f3f4f6; 
    font-weight: 700; 
  }
  .right { 
    text-align: right; 
  }
  .center { 
    text-align: center; 
  }
  .totals-grid { 
    display: grid; 
    grid-template-columns: 1.2fr 0.8fr; 
    border-top: 1px solid #222; 
    background: #f9fafb;
  }
  .left-summary, 
  .right-summary { 
    padding: 12px 16px; 
    min-height: 110px; 
  }
  .left-summary { 
    border-right: 1px solid #222; 
  }
  .summary-line { 
    display: flex; 
    justify-content: space-between; 
    gap: 12px; 
    margin-bottom: 6px; 
    font-size: 11px; 
    padding: 2px 0;
  }
  .summary-line strong { 
    font-size: 12px; 
    color: #1e3a8a;
  }
  .signature { 
    border-top: 1px solid #222; 
    margin-top: 16px; 
    padding-top: 12px; 
    text-align: right; 
    font-size: 11px; 
    font-style: italic;
  }
  .footer-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    border-top: 1px solid #222; 
    background: #fefce8;
  }
  .footer-box { 
    padding: 10px 12px; 
    min-height: 100px; 
  }
  .footer-box:first-child { 
    border-right: 1px solid #222; 
  }
  .footer-title { 
    font-size: 10px; 
    font-weight: 700; 
    margin-bottom: 8px; 
    color: #344054; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
  }
  .page-break { 
    page-break-after: always; 
    break-after: page; 
    margin-bottom: 20px; 
  }
  .batch-title { 
    font-size: 18px; 
    font-weight: 700; 
    margin-bottom: 20px; 
    text-align: center;
    padding: 10px;
    background: #f3f4f6;
    border-radius: 4px;
  }
  .error-message {
    color: #dc2626;
    padding: 20px;
    text-align: center;
    border: 1px solid #dc2626;
    background: #fef2f2;
    margin: 20px;
  }
  @media print {
    body { margin: 0; padding: 0; }
    .page-break { page-break-after: always; }
  }
`;

const getDefaultCompany = () => ({
  name: 'PARABELLUM GROUPS',
  zone: 'Zone industrielle',
  address: '',
  city: 'Abidjan',
  country: 'Côte d\'Ivoire',
  rccm: '-',
  taxId: '-',
});

const getDefaultPayroll = () => ({
  baseSalaire: 0,
  primes: 0,
  indemnite: 0,
  heuresSup: 0,
  brut: 0,
  netImposable: 0,
  netAPayer: 0,
  igr: 0,
  cnpsSalarial: 0,
  cnpsATUtilise: 0,
  cnam: 0,
  autresRetenues: 0,
  cotisationsSalariales: 0,
  annee: new Date().getFullYear(),
  mois: new Date().getMonth() + 1,
  periode: '',
  partsFiscales: 1,
  devise: 'XOF',
  employe: {},
  details: { breakdown: {} },
  status: 'PAID',
});

const getDefaultContract = () => ({
  heuresHebdo: 173,
  departement: '-',
  poste: '-',
  type: 'Employé',
  dateDebut: null,
});

const getDefaultCumulative = () => ({
  gross: 0,
  taxable: 0,
  tax: 0,
  net: 0,
});

const validatePayrollData = (data) => {
  const errors = [];
  
  if (!data) {
    errors.push('Données de paie manquantes');
    return errors;
  }
  
  if (!data.payroll) {
    errors.push('Objet payroll manquant');
  } else {
    if (data.payroll.netAPayer === undefined || data.payroll.netAPayer === null) {
      errors.push('Montant net à payer manquant');
    }
    if (data.payroll.brut === undefined || data.payroll.brut === null) {
      errors.push('Montant brut manquant');
    }
  }
  
  return errors;
};

const buildPayrollDocumentMarkup = (payload) => {
  try {
    // Validation préalable
    const validationErrors = validatePayrollData(payload);
    if (validationErrors.length > 0) {
      console.error('Validation payroll failed:', validationErrors);
      return `
        <div class="error-message">
          <strong>Erreur de génération du bulletin</strong><br/>
          ${validationErrors.map(e => `• ${escapeHtml(e)}`).join('<br/>')}
        </div>
      `;
    }
    
    // Sécurisation des données avec valeurs par défaut
    const safeCompany = { ...getDefaultCompany(), ...(payload.company || {}) };
    const safePayroll = { ...getDefaultPayroll(), ...(payload.payroll || {}) };
    const safeContract = { ...getDefaultContract(), ...(payload.contract || {}) };
    const safeCumulative = { ...getDefaultCumulative(), ...(payload.cumulative || {}) };
    
    const employee = safePayroll.employe || {};
    const breakdown = safePayroll.details?.breakdown || {};
    
    // Construction de la période d'affichage
    let periodLabel = safePayroll.periode;
    if (!periodLabel && safePayroll.mois && safePayroll.annee) {
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      periodLabel = `${monthNames[safePayroll.mois - 1]} ${safePayroll.annee}`;
    } else if (!periodLabel) {
      periodLabel = '-';
    }
    
    // Calcul du taux CNPS pour affichage
    const cnpsRate = (Number(safePayroll.cnpsATUtilise) || 0) * 100;
    
    // Construction des lignes
    const lines = [
      buildLine('100', 'SALAIRE DE BASE', safePayroll.baseSalaire, safeContract.heuresHebdo, safePayroll.baseSalaire, 0),
      buildLine('110', 'PRIMES', safePayroll.primes, 0, safePayroll.primes, 0),
      buildLine('120', 'INDÉMNITÉS', safePayroll.indemnite, 0, safePayroll.indemnite, 0),
      buildLine('130', 'HEURES SUPPLÉMENTAIRES', safePayroll.heuresSup, 0, safePayroll.heuresSup, 0),
      buildLine('600', 'IMPÔT SUR SALAIRES', 0, 0, 0, breakdown.isAmount || 0),
      buildLine('610', 'C.N.', 0, 0, 0, breakdown.asAmount || 0),
      buildLine('620', 'I.G.R', safePayroll.netImposable, 0, 0, safePayroll.igr),
      buildLine('630', 'C.N.P.S', safePayroll.baseSalaire, `${formatNumber(cnpsRate, 2)}%`, 0, safePayroll.cnpsSalarial),
      buildLine('640', 'C.M.U / C.N.A.M', 0, 0, 0, breakdown.cnam?.salarial || safePayroll.cnam || 0),
      buildLine('800', 'RETENUES DIVERSES', 0, 0, 0, safePayroll.autresRetenues || 0),
    ].filter((line) => {
      // Garder la ligne 100 toujours, et les lignes avec des valeurs non nulles
      return line.code === '100' || 
             Number(line.gains) !== 0 || 
             Number(line.deductions) !== 0;
    });
    
    const gainsSubtotal = lines.reduce((sum, line) => sum + Number(line.gains), 0);
    const deductionsSubtotal = lines.reduce((sum, line) => sum + Number(line.deductions), 0);
    
    // Construction de l'adresse complète
    const companyAddress = [safeCompany.address, safeCompany.city, safeCompany.country]
      .filter(Boolean)
      .join(' ');
    
    // Nom complet de l'employé
    const employeeFullName = `${employee.prenom || ''} ${employee.nom || ''}`.trim() || '-';
    
    // Département/Service
    const department = safeContract.departement || employee.departement || '-';
    
    // Fonction/Poste
    const position = safeContract.poste || employee.poste || '-';
    
    // Catégorie
    const category = safeContract.type || employee.categorie || 'Employé';
    
    // Date d'embauche
    const hireDate = formatDate(safeContract.dateDebut || employee.dateEmbauche);
    
    // Parts fiscales
    const fiscalParts = safePayroll.partsFiscales || employee.partsFiscales || 1;
    
    return `
      <div class="document">
        <div class="header-title">${escapeHtml(safeCompany.name)}</div>

        <div class="header-grid">
          <div class="company-box">
            <div><strong>${escapeHtml(safeCompany.zone || 'Zone industrielle')}</strong></div>
            <div class="muted">${escapeHtml(companyAddress || 'Abidjan, Côte d\'Ivoire')}</div>
            <div class="muted">RCCM: ${escapeHtml(safeCompany.rccm || '-')}</div>
            <div class="muted">Compte contribuable: ${escapeHtml(safeCompany.taxId || '-')}</div>
          </div>
          <div class="bulletin-box">
            <div style="font-size:20px;font-weight:700;margin-bottom:8px;">BULLETIN DE PAIE</div>
            <div class="muted" style="font-size:14px;font-weight:600;">${escapeHtml(periodLabel)}</div>
            <div class="muted" style="margin-top:8px;">${escapeHtml(safePayroll.devise || 'XOF')}</div>
          </div>
        </div>

        <div class="top-meta">
          <div style="border-right: 1px solid #222; padding: 8px 0;">
            <table class="meta-table">
              <tr><td>Affectation</td><td><strong>${escapeHtml(department)}</strong></td></tr>
              <tr><td>Service</td><td><strong>${escapeHtml(department)}</strong></td></tr>
              <tr><td>Fonction</td><td><strong>${escapeHtml(position)}</strong></td></tr>
              <tr><td>Catégorie</td><td><strong>${escapeHtml(category)}</strong></td></tr>
            </table>
          </div>
          <div style="padding: 8px 0;">
            <table class="meta-table">
              <tr><td>Nom et Prénoms</td><td><strong>${escapeHtml(employeeFullName)}</strong></td></tr>
              <tr><td>Matricule</td><td><strong>${escapeHtml(employee.matricule || '-')}</strong></td></tr>
              <tr><td>Parts fiscales</td><td><strong>${escapeHtml(String(fiscalParts))}</strong></td></tr>
              <tr><td>Date d'embauche</td><td><strong>${escapeHtml(hireDate)}</strong></td></tr>
              <tr><td>N° CNPS</td><td><strong>${escapeHtml(employee.cnpsNumber || '-')}</strong></td></tr>
              <tr><td>Salarié</td><td><strong>Mensuel</strong></td></tr>
            </table>
          </div>
        </div>

        <table class="payroll-table">
          <thead>
            <tr>
              <th class="center" style="width:8%">Codes</th>
              <th style="width:32%">Libellés</th>
              <th class="right" style="width:15%">Bases</th>
              <th class="center" style="width:10%">HR/JR</th>
              <th class="right" style="width:17%">Gains (${escapeHtml(safePayroll.devise || 'XOF')})</th>
              <th class="right" style="width:18%">Retenues (${escapeHtml(safePayroll.devise || 'XOF')})</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map(line => `
              <tr>
                <td class="center">${escapeHtml(line.code)}</td>
                <td>${escapeHtml(line.label)}</td>
                <td class="right">${formatNumber(line.base)}</td>
                <td class="center">${escapeHtml(String(line.unit))}</td>
                <td class="right">${formatNumber(line.gains)}</td>
                <td class="right">${formatNumber(line.deductions)}</td>
              </tr>
            `).join('')}
            <tr style="background:#f9fafb;font-weight:700;">
              <td colspan="4" class="right"><strong>Sous totaux</strong></td>
              <td class="right"><strong>${formatNumber(gainsSubtotal)}</strong></td>
              <td class="right"><strong>${formatNumber(deductionsSubtotal)}</strong></td>
            </tr>
            <tr style="background:#eef2ff;font-weight:700;">
              <td colspan="4" class="right"><strong>Salaire net à payer</strong></td>
              <td colspan="2" class="right" style="font-size:12px;">
                <strong>${formatNumber(safePayroll.netAPayer)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="totals-grid">
          <div class="left-summary">
            <div class="summary-line"><span>Brut imposable</span><strong>${formatNumber(safePayroll.brut)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong></div>
            <div class="summary-line"><span>Net imposable</span><strong>${formatNumber(safePayroll.netImposable)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong></div>
            <div class="summary-line"><span>Total cotisations salariales</span><strong>${formatNumber(safePayroll.cotisationsSalariales)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong></div>
            <div class="summary-line"><span>Total retenues</span><strong>${formatNumber(deductionsSubtotal)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong></div>
            <div class="summary-line" style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:6px;">
              <span style="font-size:12px;font-weight:700;">Net à payer</span>
              <strong style="font-size:14px;color:#059669;">${formatNumber(safePayroll.netAPayer)} ${escapeHtml(safePayroll.devise || 'XOF')}</strong>
            </div>
          </div>
          <div class="right-summary">
            <div class="summary-line"><span>Base CNPS</span><strong>${formatNumber(safePayroll.baseSalaire)}</strong></div>
            <div class="summary-line"><span>Cotisation retraite</span><strong>${formatNumber(safePayroll.cnpsSalarial)}</strong></div>
            <div class="summary-line"><span>CMU / CNAM</span><strong>${formatNumber(breakdown.cnam?.salarial || safePayroll.cnam || 0)}</strong></div>
            <div class="summary-line"><span>IGR</span><strong>${formatNumber(safePayroll.igr)}</strong></div>
            <div class="signature">Cachet et signature de l'employeur</div>
          </div>
        </div>

        <div class="footer-grid">
          <div class="footer-box">
            <div class="footer-title">Récapitulatif période</div>
            <div class="summary-line"><span>Début contrat</span><span>${escapeHtml(hireDate)}</span></div>
            <div class="summary-line"><span>Heures hebdomadaires</span><span>${escapeHtml(String(safeContract.heuresHebdo || 40))}h</span></div>
            <div class="summary-line"><span>Statut</span><span>${escapeHtml(safePayroll.status || 'PAID')}</span></div>
          </div>
          <div class="footer-box">
            <div class="footer-title">Cumul ${escapeHtml(String(safePayroll.annee))}</div>
            <div class="summary-line"><span>Brut cumulé</span><span>${formatNumber(safeCumulative.gross)}</span></div>
            <div class="summary-line"><span>Net imposable cumulé</span><span>${formatNumber(safeCumulative.taxable)}</span></div>
            <div class="summary-line"><span>Impôt cumulé</span><span>${formatNumber(safeCumulative.tax)}</span></div>
            <div class="summary-line"><span>Net cumulé</span><span>${formatNumber(safeCumulative.net)}</span></div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error building payroll document markup:', error);
    return `
      <div class="error-message">
        <strong>Erreur technique lors de la génération du bulletin</strong><br/>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
};

const buildPayrollPdfHtml = (payload) => {
  if (!payload) {
    throw new Error('Payload manquant pour générer le bulletin de paie');
  }
  
  const markup = buildPayrollDocumentMarkup(payload);
  
  // Vérification que le markup n'est pas vide
  if (!markup || markup.trim().length < 50) {
    throw new Error('Le markup généré est vide ou trop court');
  }
  
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bulletin de paie - ${escapeHtml(payload.payroll?.employe?.nom || '')} ${escapeHtml(payload.payroll?.periode || '')}</title>
    <style>${getPayrollPdfStyles()}</style>
  </head>
  <body>
    ${markup}
  </body>
</html>`;
};

const buildGroupedPayrollPdfHtml = ({ title, documents }) => {
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    throw new Error('Aucun document à générer');
  }
  
  const documentsHtml = documents
    .map((document, index) => {
      try {
        const markup = buildPayrollDocumentMarkup(document);
        const pageBreakClass = index < documents.length - 1 ? 'page-break' : '';
        return `<div class="${pageBreakClass}">${markup}</div>`;
      } catch (error) {
        console.error(`Error building document ${index}:`, error);
        return `
          <div class="error-message">
            <strong>Erreur pour le document ${index + 1}</strong><br/>
            ${escapeHtml(error.message)}
          </div>
        `;
      }
    })
    .join('');
  
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title || 'Bulletins de paie groupés')}</title>
    <style>${getPayrollPdfStyles()}</style>
  </head>
  <body>
    ${title ? `<div class="batch-title">${escapeHtml(title)}</div>` : ''}
    ${documentsHtml}
  </body>
</html>`;
};

module.exports = {
  buildPayrollPdfHtml,
  buildGroupedPayrollPdfHtml,
  formatDate,
  formatNumber,
  escapeHtml,
};