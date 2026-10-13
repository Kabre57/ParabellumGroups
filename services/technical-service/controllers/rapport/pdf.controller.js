// Generation du PDF des rapports techniques.
const { prisma, VALID_STATUSES } = require('./shared');
const puppeteer = require('puppeteer-core');

/**
 * Génère un PDF pour un rapport
 */
exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const rapport = await prisma.rapport.findUnique({
      where: { id },
      include: {
        intervention: {
          include: {
            mission: true,
            techniciens: {
              include: {
                technicien: true
              }
            }
          }
        },
        redacteur: {
          include: {
            specialite: true
          }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    const escapeHtml = (value) => {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const mission = rapport.intervention?.mission;
    const techniciens = rapport.intervention?.techniciens || [];
    const photos = Array.isArray(rapport.photos) ? rapport.photos : [];
    const internalBaseUrl = process.env.MINIO_INTERNAL_URL;
    const photosForPdf = internalBaseUrl
      ? photos.map((url) => url.replace(process.env.MINIO_PUBLIC_URL || '', internalBaseUrl))
      : photos;

    const logoUrl = process.env.REPORT_LOGO_URL || '';
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; gap: 12px; }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .logo { width: 56px; height: 56px; object-fit: contain; }
          .watermark {
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.08);
            z-index: 0;
            pointer-events: none;
            white-space: nowrap;
          }
          .title { font-size: 18px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #333; }
          .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
          th { background: #f0f0f0; }
          .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .photos img { width: 100%; border: 1px solid #ccc; }
          .footer { margin-top: 16px; border-top: 1px solid #000; padding-top: 6px; font-size: 10px; text-align: center; color: #444; }
        </style>
      </head>
      <body>
        <div class="watermark">RAPPORT ${escapeHtml(String(rapport.id).slice(0, 8).toUpperCase())}</div>
        <div class="header">
          <div class="header-left">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" />` : ''}
            <div>
              <div class="title">PARABELLUM GROUP</div>
              <div class="subtitle">Rapport d'Intervention</div>
              <div class="subtitle">${escapeHtml(rapport.titre || 'Rapport')}</div>
            </div>
          </div>
          <div class="subtitle">
            Réf: ${escapeHtml(String(rapport.id).slice(0, 8).toUpperCase())}<br/>
            Date: ${escapeHtml(new Date(rapport.dateCreation).toLocaleDateString('fr-FR'))}
          </div>
        </div>

        <div class="section-title">Mission associée</div>
        <table>
          <tbody>
            <tr>
              <th>N° Mission</th>
              <td>${escapeHtml(mission?.numeroMission || '-')}</td>
              <th>Titre</th>
              <td>${escapeHtml(mission?.titre || '-')}</td>
            </tr>
            <tr>
              <th>Client</th>
              <td>${escapeHtml(mission?.clientNom || '-')}</td>
              <th>Contact</th>
              <td>${escapeHtml(mission?.clientContact || '-')}</td>
            </tr>
            <tr>
              <th>Adresse</th>
              <td colspan="3">${escapeHtml(mission?.adresse || '-')}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Techniciens</div>
        <table>
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Spécialité</th></tr>
          </thead>
          <tbody>
            ${techniciens.length ? techniciens.map((t) => {
              const tech = t.technicien || {};
              return `<tr>
                <td>${escapeHtml(`${tech.prenom || ''} ${tech.nom || ''}`.trim())}</td>
                <td>${escapeHtml(tech.email || '-')}</td>
                <td>${escapeHtml(tech.specialite?.nom || '-')}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="3">Aucun technicien</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Observations</div>
        <table>
          <tbody>
            <tr><th>Travaux effectués</th><td>${escapeHtml(rapport.contenu || '-')}</td></tr>
            <tr><th>Conclusions</th><td>${escapeHtml(rapport.conclusions || '-')}</td></tr>
            <tr><th>Recommandations</th><td>${escapeHtml(rapport.recommandations || '-')}</td></tr>
          </tbody>
        </table>

        <div class="section-title">Photos</div>
        <div class="photos">
          ${photosForPdf.length ? photosForPdf.map((url) => `<img src="${escapeHtml(url)}" />`).join('') : '<div>Aucune photo</div>'}
        </div>

        <div class="footer">
          PARABELLUM GROUP • Service Technique Professionnel
        </div>
      </body>
      </html>
    `;

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rapport-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf rapport:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF'
    });
  }
};
