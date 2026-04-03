const { PrismaClient } = require('@prisma/client');
const { buildPuppeteerLaunchOptions } = require('../utils/pdf');
const { buildPayrollPdfHtml, buildGroupedPayrollPdfHtml } = require('../utils/payrollPdfTemplate');

const prisma = new PrismaClient();

const parseNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizePayrollPayload = (payload) => {
  if (!payload) return {};
  const next = { ...payload };
  if (next.statut && !next.statutPaiement) {
    next.statutPaiement = next.statut;
  }
  delete next.statut;
  return next;
};

const parsePeriod = (period) => {
  if (!period) return { year: null, month: null };
  const match = String(period).match(/(\\d{4})[-/](\\d{1,2})/);
  if (!match) return { year: null, month: null };
  return { year: Number(match[1]), month: Number(match[2]) };
};

const formatPeriod = (month, year) => {
  if (!month || !year) return '';
  return `${year}-${String(month).padStart(2, '0')}`;
};

const buildCompanyPayload = async () => {
  const config = await prisma.configuration.findFirst();
  return {
    name: config?.nomEntreprise || process.env.COMPANY_NAME || 'PARABELLUM GROUPS',
    zone: config?.adresseSiege || process.env.COMPANY_ZONE || 'Zone industrielle',
    address: config?.adresseSiege || process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || 'Abidjan',
    country: process.env.COMPANY_COUNTRY || "Côte d'Ivoire",
    rccm: process.env.COMPANY_RCCM || '-',
    taxId: config?.numeroCc || process.env.COMPANY_TAX_ID || '-',
  };
};

const mapBulletinToPayrollPayload = (bulletin, employe, contract, cumulative) => {
  const periode = bulletin.periode || '';
  const parsed = parsePeriod(periode);
  const annee = parsed.year || (bulletin.dateGeneration ? new Date(bulletin.dateGeneration).getFullYear() : null);
  const mois = parsed.month || (bulletin.dateGeneration ? new Date(bulletin.dateGeneration).getMonth() + 1 : null);
  const salaireBrut = parseNumber(bulletin.salaireBrut);
  const totalRetenues = parseNumber(bulletin.totalRetenues);
  const salaireNet = parseNumber(bulletin.salaireNet);
  const primes = parseNumber(bulletin.primesTotal);
  const heuresSup = parseNumber(bulletin.heuresSuppMontant);

  return {
    baseSalaire: parseNumber(bulletin.salaireBase),
    primes,
    indemnite: 0,
    heuresSup,
    brut: salaireBrut,
    netImposable: salaireBrut - totalRetenues,
    netAPayer: salaireNet,
    igr: parseNumber(bulletin.impotIgr),
    cnpsSalarial: parseNumber(bulletin.cotisationCnpsSalariale),
    cnpsATUtilise: 0,
    cnam: 0,
    autresRetenues: 0,
    cotisationsSalariales: totalRetenues,
    annee: annee || null,
    mois: mois || null,
    periode: periode || formatPeriod(mois, annee),
    partsFiscales: employe?.nombrePartsIgr || 1,
    devise: process.env.PAYROLL_CURRENCY || 'XOF',
    employe: {
      matricule: employe?.matricule,
      nom: employe?.nom,
      prenom: employe?.prenoms,
      nomComplet: employe?.nomComplet,
      cnpsNumber: employe?.numeroCnps,
      poste: contract?.posteOccupe,
      departement: contract?.service || contract?.direction,
      dateEmbauche: contract?.dateDebut,
      categorie: contract?.categorieProfessionnelle,
    },
    details: {
      breakdown: {
        isAmount: parseNumber(bulletin.impotIs),
        asAmount: parseNumber(bulletin.impotCn),
        cnam: { salarial: 0 },
      },
    },
    status: bulletin.statutPaiement || 'GENERE',
  };
};

const renderPdfFromHtml = async (html) => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());
  let page;
  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
    });
    if (!pdf || pdf.length < 1000) {
      throw new Error('PDF genere vide');
    }
    return pdf;
  } finally {
    if (page) await page.close();
    await browser.close();
  }
};

const buildCumulative = async (matricule, year) => {
  if (!year) return { gross: 0, taxable: 0, tax: 0, net: 0 };
  const rows = await prisma.bulletinPaie.findMany({
    where: {
      matricule,
      dateGeneration: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      },
    },
  });
  return rows.reduce(
    (acc, row) => ({
      gross: acc.gross + parseNumber(row.salaireBrut),
      taxable: acc.taxable + (parseNumber(row.salaireBrut) - parseNumber(row.totalRetenues)),
      tax: acc.tax + parseNumber(row.impotIgr),
      net: acc.net + parseNumber(row.salaireNet),
    }),
    { gross: 0, taxable: 0, tax: 0, net: 0 }
  );
};

class PayrollController {
  async getAllPayroll(req, res) {
    try {
      const { page = 1, pageSize = 20, search, employeeId, year, month } = req.query;
      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);
      const where = {};
      if (employeeId) where.matricule = employeeId;
      if (search) where.periode = { contains: String(search), mode: 'insensitive' };

      if (year || month) {
        const start = new Date(Date.UTC(Number(year || 1970), Number((month || 1) - 1), 1));
        const end = new Date(Date.UTC(Number(year || 2100), Number((month || 12) - 1) + 1, 0, 23, 59, 59));
        where.dateGeneration = { gte: start, lte: end };
      }

      const [rows, total] = await Promise.all([
        prisma.bulletinPaie.findMany({
          where,
          skip,
          take,
          orderBy: { dateGeneration: 'desc' },
          include: { employe: true },
        }),
        prisma.bulletinPaie.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          data: rows,
          total,
          page: Number(page),
          pageSize: take,
          totalPages: Math.max(1, Math.ceil(total / Math.max(1, take))),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPayroll(req, res) {
    try {
      const id = Number(req.params.id);
      const payroll = await prisma.bulletinPaie.findUnique({
        where: { id },
        include: { employe: true },
      });
      if (!payroll) return res.status(404).json({ success: false, error: 'Bulletin introuvable' });
      res.json({ success: true, data: payroll });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPayroll(req, res) {
    try {
      const created = await prisma.bulletinPaie.create({ data: normalizePayrollPayload(req.body) });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePayroll(req, res) {
    try {
      const id = Number(req.params.id);
      const updated = await prisma.bulletinPaie.update({
        where: { id },
        data: normalizePayrollPayload(req.body),
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deletePayroll(req, res) {
    try {
      const id = Number(req.params.id);
      await prisma.bulletinPaie.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPayrollOverview(req, res) {
    try {
      const { month, year } = req.query;
      const where = {};
      if (year || month) {
        const start = new Date(Date.UTC(Number(year || 1970), Number((month || 1) - 1), 1));
        const end = new Date(Date.UTC(Number(year || 2100), Number((month || 12) - 1) + 1, 0, 23, 59, 59));
        where.dateGeneration = { gte: start, lte: end };
      }
      const [payrolls, employees] = await Promise.all([
        prisma.bulletinPaie.findMany({ where }),
        prisma.employe.findMany(),
      ]);

      const totalGross = payrolls.reduce((sum, row) => sum + parseNumber(row.salaireBrut), 0);
      const totalNet = payrolls.reduce((sum, row) => sum + parseNumber(row.salaireNet), 0);
      const totalEmployerCost = payrolls.reduce((sum, row) => sum + parseNumber(row.coutTotalEmployeur), 0);
      const totalTaxes = payrolls.reduce((sum, row) => sum + parseNumber(row.impotIgr), 0);
      const totalRetenues = payrolls.reduce((sum, row) => sum + parseNumber(row.totalRetenues), 0);
      const paidCount = payrolls.filter((row) => String(row.statutPaiement || '').toUpperCase() === 'PAYE').length;
      const validatedCount = payrolls.filter((row) => String(row.statutPaiement || '').toUpperCase() === 'VALIDE').length;
      const missingCnpsCount = employees.filter((e) => !e.numeroCnps).length;

      res.json({
        success: true,
        data: {
          period: {
            month: month ? Number(month) : null,
            year: year ? Number(year) : null,
            label: month && year ? `${new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : '',
          },
          workforce: {
            totalEmployees: employees.length,
            activeEmployees: employees.filter((e) => String(e.statut || '').toLowerCase() === 'actif').length,
            coveredEmployees: employees.length - missingCnpsCount,
            missingCnpsCount,
            missingCnamCount: 0,
            supportedInitialRange: '25-30 salariés',
            supportedScale: 100,
          },
          payroll: {
            bulletinsCount: payrolls.length,
            validatedCount,
            paidCount,
            totalGross,
            totalNet,
            totalEmployerCost,
            totalTaxes,
            totalEmployeeContributions: totalRetenues,
          },
          compliance: [],
          features: [],
          legalRates: [],
          declarations: [],
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPayrollPdf(req, res) {
    try {
      const id = Number(req.params.id);
      const payroll = await prisma.bulletinPaie.findUnique({
        where: { id },
      });
      if (!payroll) return res.status(404).json({ error: 'Bulletin introuvable' });

      const [employe, contract, cumulative, company] = await Promise.all([
        prisma.employe.findUnique({ where: { matricule: payroll.matricule } }),
        prisma.contrat.findFirst({
          where: { matricule: payroll.matricule },
          orderBy: { dateDebut: 'desc' },
        }),
        buildCumulative(payroll.matricule, parsePeriod(payroll.periode).year || new Date(payroll.dateGeneration || Date.now()).getFullYear()),
        buildCompanyPayload(),
      ]);

      const payload = {
        company,
        payroll: mapBulletinToPayrollPayload(payroll, employe, contract, cumulative),
        contract,
        cumulative,
      };
      const html = buildPayrollPdfHtml(payload);
      const pdf = await renderPdfFromHtml(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="bulletin-${payroll.id}.pdf"`);
      res.send(pdf);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportGroupedPayrollPdf(req, res) {
    try {
      const { month, year, employeeIds } = req.query;
      const where = {};
      if (employeeIds) {
        const ids = String(employeeIds)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        if (ids.length) where.matricule = { in: ids };
      }
      if (year || month) {
        const start = new Date(Date.UTC(Number(year || 1970), Number((month || 1) - 1), 1));
        const end = new Date(Date.UTC(Number(year || 2100), Number((month || 12) - 1) + 1, 0, 23, 59, 59));
        where.dateGeneration = { gte: start, lte: end };
      }
      const payrolls = await prisma.bulletinPaie.findMany({ where });
      if (payrolls.length === 0) {
        return res.status(404).json({ error: 'Aucun bulletin à exporter' });
      }

      const company = await buildCompanyPayload();
      const documents = await Promise.all(
        payrolls.map(async (row) => {
          const employe = await prisma.employe.findUnique({ where: { matricule: row.matricule } });
          const contract = await prisma.contrat.findFirst({
            where: { matricule: row.matricule },
            orderBy: { dateDebut: 'desc' },
          });
          const cumulative = await buildCumulative(row.matricule, parsePeriod(row.periode).year || new Date(row.dateGeneration || Date.now()).getFullYear());
          return {
            company,
            payroll: mapBulletinToPayrollPayload(row, employe, contract, cumulative),
            contract,
            cumulative,
          };
        })
      );

      const title = 'Bulletins de paie groupés';
      const html = buildGroupedPayrollPdfHtml({ title, documents });
      const pdf = await renderPdfFromHtml(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="bulletins-groupes.pdf"');
      res.send(pdf);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportPayrollDisa(req, res) {
    try {
      const rows = await prisma.bulletinPaie.findMany({ include: { employe: true } });
      const csv = [
        ['Matricule', 'Employe', 'Periode', 'Salaire Brut', 'CNPS Salarial', 'CNPS Patronal', 'Net'],
        ...rows.map((row) => [
          row.matricule,
          row.employe?.nomComplet || `${row.employe?.prenoms || ''} ${row.employe?.nom || ''}`.trim(),
          row.periode || '',
          row.salaireBrut ?? 0,
          row.cotisationCnpsSalariale ?? 0,
          row.cotisationCnpsPatronale ?? 0,
          row.salaireNet ?? 0,
        ]),
      ]
        .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="disa-export.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportPayrollDgi(req, res) {
    try {
      const rows = await prisma.bulletinPaie.findMany({ include: { employe: true } });
      const csv = [
        ['Matricule', 'Employe', 'Periode', 'Salaire Brut', 'IGR', 'Salaire Net'],
        ...rows.map((row) => [
          row.matricule,
          row.employe?.nomComplet || `${row.employe?.prenoms || ''} ${row.employe?.nom || ''}`.trim(),
          row.periode || '',
          row.salaireBrut ?? 0,
          row.impotIgr ?? 0,
          row.salaireNet ?? 0,
        ]),
      ]
        .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dgi-export.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generatePayslip(req, res) {
    try {
      const { employeId, matricule, mois, annee } = req.body;
      const id = employeId || matricule;
      if (!id) return res.status(400).json({ error: 'Matricule requis' });
      const period = formatPeriod(mois, annee);

      const [employe, contrat, variables] = await Promise.all([
        prisma.employe.findUnique({ where: { matricule: id } }),
        prisma.contrat.findFirst({ where: { matricule: id }, orderBy: { dateDebut: 'desc' } }),
        prisma.variablesMensuelle.findFirst({ where: { matricule: id, periode: period } }),
      ]);

      if (!employe) return res.status(404).json({ error: 'Employé introuvable' });

      const salaireBase = parseNumber(contrat?.salaireBaseMensuel);
      const primesTotal = [
        variables?.primeRendement,
        variables?.primeTransport,
        variables?.primeSalissure,
        variables?.primeAnciennete,
        variables?.primesDiverses,
        variables?.gratificationMensuelle,
        variables?.indemniteLogement,
        variables?.indemniteRepas,
      ].reduce((sum, v) => sum + parseNumber(v), 0);
      const heuresSuppMontant = 0;
      const salaireBrut = salaireBase + primesTotal + heuresSuppMontant;
      const totalRetenues = parseNumber(variables?.retenuePret) + parseNumber(variables?.retenueAutre);
      const salaireNet = salaireBrut - totalRetenues;

      const existing = await prisma.bulletinPaie.findFirst({ where: { matricule: id, periode: period } });
      const payload = {
        matricule: id,
        periode: period,
        salaireBase,
        heuresSuppMontant,
        primesTotal,
        salaireBrut,
        totalRetenues,
        salaireNet,
        coutTotalEmployeur: salaireBrut,
        statutPaiement: 'GENERE',
        variablesMensuelleId: variables?.id,
      };

      const bulletin = existing
        ? await prisma.bulletinPaie.update({ where: { id: existing.id }, data: payload })
        : await prisma.bulletinPaie.create({ data: payload });

      res.json({ success: true, data: bulletin });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateAllCurrent(req, res) {
    try {
      const { mois, annee } = req.body;
      const period = formatPeriod(mois, annee);
      const employes = await prisma.employe.findMany();
      let created = 0;
      for (const emp of employes) {
        const existing = await prisma.bulletinPaie.findFirst({ where: { matricule: emp.matricule, periode: period } });
        if (existing) continue;
        await prisma.bulletinPaie.create({
          data: {
            matricule: emp.matricule,
            periode: period,
            salaireBase: 0,
            salaireBrut: 0,
            salaireNet: 0,
            totalRetenues: 0,
            coutTotalEmployeur: 0,
            statutPaiement: 'GENERE',
          },
        });
        created += 1;
      }
      res.json({ success: true, data: { created } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PayrollController();
