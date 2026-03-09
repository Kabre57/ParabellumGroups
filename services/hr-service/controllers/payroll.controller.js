const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Défauts ivoiriens – écrasables par la base ou les variables d'env
const DEFAULTS = {
  SMIG: parseFloat(process.env.SMIG || '75000'),
  CEILING_RETIREMENT: parseFloat(process.env.CEILING_RETIREMENT || '1647315'), // CNPS retraite
  CEILING_FAMILY_AT: parseFloat(process.env.CEILING_FAMILY_AT || '70000'),     // PF + AT
  CEILING_CNAM: process.env.CEILING_CNAM ? parseFloat(process.env.CEILING_CNAM) : null,
  CNPS_RET_EMPLOYEE: parseFloat(process.env.CNPS_RET_EMPLOYEE || '0.063'),
  CNPS_RET_EMPLOYER: parseFloat(process.env.CNPS_RET_EMPLOYER || '0.077'),
  CNPS_FAMILY: parseFloat(process.env.CNPS_FAMILY || '0.0575'),
  CNPS_AT: parseFloat(process.env.CNPS_AT || '0.02'),
  CNAM_EMPLOYER: parseFloat(process.env.CNAM_EMPLOYER || '0.0333'),
  CNAM_FORFAIT: parseFloat(process.env.CNAM_FORFAIT || '1000'),
  CNAM_MODE: process.env.CNAM_MODE || 'FORFAIT', // FORFAIT ou TAUX
  FDFP_EMPLOYER: parseFloat(process.env.FDFP_EMPLOYER || '0.004'),
  IS_EMPLOYER: parseFloat(process.env.IS_EMPLOYER || '0.012'),
  AS_EMPLOYER: parseFloat(process.env.AS_EMPLOYER || '0.012'),
  ABATTEMENT_PRO: parseFloat(process.env.ABATTEMENT_PRO || '0.20'),
  HOURS_BASE: parseFloat(process.env.HOURS_BASE || '173'),
};

// Barème simplifié si aucun barème IGR officiel n'est injecté en BD
const DEFAULT_IGR = [
  { min: 0, max: 50000, rate: 0, fixed: 0 },
  { min: 50000, max: 130000, rate: 0.015, fixed: 0 },
  { min: 130000, max: 200000, rate: 0.10, fixed: 1200 },
  { min: 200000, max: 300000, rate: 0.15, fixed: 8200 },
  { min: 300000, max: 1000000, rate: 0.20, fixed: 23200 },
  { min: 1000000, max: Infinity, rate: 0.25, fixed: 163200 },
];

class PayrollController {
  constructor() {
    this.paramsPromise = null;
  }

  async loadParams() {
    if (!this.paramsPromise) {
      this.paramsPromise = (async () => {
        const [taxSettings, payrollConstants, riskBands, igrBrackets] = await Promise.all([
          prisma.taxSetting.findMany(),
          prisma.payrollConstant.findMany(),
          prisma.riskBand.findMany(),
          prisma.igrBracket.findMany({ orderBy: { min: 'asc' } }),
        ]);

        const cfg = { ...DEFAULTS };
        payrollConstants.forEach(c => {
          const key = c.key?.toUpperCase();
          if (key && Object.prototype.hasOwnProperty.call(cfg, key)) {
            cfg[key] = parseFloat(c.value);
          }
        });

        taxSettings.forEach(t => {
          const rate = parseFloat(t.rate);
          switch (t.type) {
            case 'CNPS_AT':
              cfg.CNPS_AT = rate;
              if (t.ceiling) cfg.CEILING_FAMILY_AT = parseFloat(t.ceiling);
              break;
            case 'CNAM_EMPLOYER':
              cfg.CNAM_EMPLOYER = rate;
              if (t.ceiling) cfg.CEILING_CNAM = parseFloat(t.ceiling);
              break;
            case 'CNPS_RET_EMPLOYEE':
              cfg.CNPS_RET_EMPLOYEE = rate;
              if (t.ceiling) cfg.CEILING_RETIREMENT = parseFloat(t.ceiling);
              break;
            case 'CNPS_RET_EMPLOYER':
              cfg.CNPS_RET_EMPLOYER = rate;
              if (t.ceiling) cfg.CEILING_RETIREMENT = parseFloat(t.ceiling);
              break;
            case 'CNPS_FAMILY':
              cfg.CNPS_FAMILY = rate;
              break;
            case 'FDFP_EMPLOYER':
              cfg.FDFP_EMPLOYER = rate;
              break;
            case 'IS_EMPLOYER':
              cfg.IS_EMPLOYER = rate;
              break;
            case 'AS_EMPLOYER':
              cfg.AS_EMPLOYER = rate;
              break;
            default:
              break;
          }
        });

        const igr = igrBrackets.length > 0
          ? igrBrackets.map(b => ({
              min: parseFloat(b.min),
              max: b.max ? parseFloat(b.max) : Infinity,
              rate: parseFloat(b.rate),
              fixed: parseFloat(b.deduction || 0),
            }))
          : DEFAULT_IGR;

        return { cfg, igr, riskBands };
      })();
    }
    return this.paramsPromise;
  }

  calculateCNPS(baseSalary, cfg, cnpsATValue) {
    const assietteRet = Math.min(Math.max(baseSalary, cfg.SMIG), cfg.CEILING_RETIREMENT);
    const assietteFamAt = Math.min(Math.max(baseSalary, cfg.SMIG), cfg.CEILING_FAMILY_AT);
    const atRate = cnpsATValue ?? cfg.CNPS_AT;
    return {
      employeeRet: assietteRet * cfg.CNPS_RET_EMPLOYEE,
      employerRet: assietteRet * cfg.CNPS_RET_EMPLOYER,
      employerFamily: assietteFamAt * cfg.CNPS_FAMILY,
      employerAT: assietteFamAt * atRate,
    };
  }

  calculateCNAM(baseSalary, cfg, ayantsDroit = 0) {
    if ((cfg.CNAM_MODE || '').toUpperCase() === 'FORFAIT') {
      const personnes = Math.max(1 + (ayantsDroit || 0), 1);
      const montant = personnes * (cfg.CNAM_FORFAIT || 1000);
      return { salarial: montant, employer: montant };
    }
    const assietteRaw = Math.max(baseSalary, cfg.SMIG);
    const assiette = cfg.CEILING_CNAM ? Math.min(assietteRaw, cfg.CEILING_CNAM) : assietteRaw;
    return { salarial: assiette * cfg.CNAM_EMPLOYER, employer: assiette * cfg.CNAM_EMPLOYER };
  }

  calculateFDFP(baseSalary, cfg) {
    const assiette = Math.max(baseSalary, cfg.SMIG);
    return assiette * cfg.FDFP_EMPLOYER;
  }

  calculateIGR(taxableIncome, igrTranches) {
    const tranche = igrTranches.find(t => taxableIncome > t.min && taxableIncome <= t.max);
    if (!tranche) return 0;
    return tranche.fixed + (taxableIncome - tranche.min) * tranche.rate;
  }

  computeAyantsDroit(employe) {
    if (!employe) return 0;
    const enfants = employe.nombreEnfants || 0;
    const marie = (employe.situationMatrimoniale || '').toLowerCase().startsWith('mari');
    return enfants + (marie ? 1 : 0);
  }

  computePayrollAmounts({ baseSalaire, heuresSup = 0, heuresSupDetails = [], primes = 0, indemnite = 0, autresRetenues = 0, deductions = [], parts = 1, cnpsATValue, employe }, cfg, igr, riskBands) {
    const base = Math.max(parseFloat(baseSalaire), cfg.SMIG);

    // Heures sup éventuelles
    let montantHeuresSup = parseFloat(heuresSup) || 0;
    if (Array.isArray(heuresSupDetails) && heuresSupDetails.length > 0) {
      const hourly = Math.max(parseFloat(baseSalaire), cfg.SMIG) / cfg.HOURS_BASE;
      montantHeuresSup = heuresSupDetails.reduce((sum, hs) => {
        const hrs = parseFloat(hs.hours || 0);
        const rate = parseFloat(hs.rate || 1);
        return sum + hrs * hourly * rate;
      }, 0);
    }

    const cnps = this.calculateCNPS(base, cfg, cnpsATValue);
    const ayantsDroit = this.computeAyantsDroit(employe);
    const cnam = this.calculateCNAM(base, cfg, ayantsDroit);
    const fdfp = this.calculateFDFP(base, cfg);

    const brut = base + montantHeuresSup + parseFloat(primes) + parseFloat(indemnite);
    const isAmount = brut * cfg.IS_EMPLOYER;
    const asAmount = brut * cfg.AS_EMPLOYER;
    const cotSal = cnps.employeeRet + isAmount + asAmount + cnam.salarial;
    const cotPat = cnps.employerRet + cnps.employerFamily + cnps.employerAT + cnam.employer + fdfp;

    const taxableBeforeAbattement = brut - cotSal;
    const abattement = taxableBeforeAbattement * cfg.ABATTEMENT_PRO;
    const taxableAfterAbattement = Math.max(taxableBeforeAbattement - abattement, 0);
    const netImposablePart = taxableAfterAbattement / parts;
    const igrAmount = this.calculateIGR(netImposablePart, igr) * parts;
    const autresRet = parseFloat(autresRetenues) || 0;
    const deductionsTotal = deductions.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    const netAPayer = brut - cotSal - igrAmount - autresRet - deductionsTotal;

    return {
      base,
      brut,
      cotSal,
      cotPat,
      igrAmount,
      abattement,
      taxableAfterAbattement,
      netAPayer,
      deductionsTotal,
      autresRet,
      cnps,
      cnam,
      fdfp,
      isAmount,
      asAmount,
      montantHeuresSup,
      ayantsDroit,
    };
  }

  async getAllPayroll(req, res) {
    try {
      const { page = 1, pageSize = 20, search, employeeId, year, month } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
      const take = parseInt(pageSize, 10);

      const where = {};
      if (employeeId) where.employeId = employeeId;
      if (year) where.annee = parseInt(year, 10);
      if (month) where.mois = parseInt(month, 10);
      if (search) where.periode = { contains: search, mode: 'insensitive' };

      const [rows, total] = await Promise.all([
        prisma.payroll.findMany({
          where,
          skip,
          take,
          orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
          include: {
            employe: { select: { id: true, nom: true, prenom: true, matricule: true, email: true } },
          },
        }),
        prisma.payroll.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          data: rows,
          total,
          page: parseInt(page, 10),
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des bulletins',
        error: error.message,
      });
    }
  }

  async getPayroll(req, res) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id: req.params.id },
        include: {
          employe: { select: { id: true, nom: true, prenom: true, matricule: true, cnpsNumber: true, cnamNumber: true, poste: true, departement: true } },
        },
      });
      if (!payroll) return res.status(404).json({ success: false, message: 'Bulletin de paie non trouvé' });
      res.json({ success: true, data: payroll });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération du bulletin', error: error.message });
    }
  }

  async getPayrollPdf(req, res) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id: req.params.id },
        include: {
          employe: { select: { nom: true, prenom: true, matricule: true, departement: true, poste: true } },
        },
      });
      if (!payroll) return res.status(404).json({ success: false, message: 'Bulletin non trouvé' });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; }
              h1 { font-size: 20px; margin-bottom: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              td, th { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
              th { background: #f5f5f5; text-align: left; }
            </style>
          </head>
          <body>
            <h1>Bulletin de paie</h1>
            <div>Employé : ${payroll.employe?.prenom || ''} ${payroll.employe?.nom || ''} (${payroll.employe?.matricule || ''})</div>
            <div>Période : ${payroll.periode || payroll.mois + '/' + payroll.annee}</div>
            <table>
              <tr><th>Brut</th><td>${payroll.brut}</td></tr>
              <tr><th>CNPS Sal.</th><td>${payroll.cnpsSalarial}</td></tr>
              <tr><th>CNPS Pat.</th><td>${payroll.cnpsPatronal}</td></tr>
              <tr><th>IGR</th><td>${payroll.igr}</td></tr>
              <tr><th>Net à payer</th><td>${payroll.netAPayer}</td></tr>
            </table>
          </body>
        </html>`;

      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: 'A4' });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="bulletin-${payroll.id}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      console.error('Error generating payroll PDF:', error);
      return res.status(500).json({ success: false, message: 'Erreur génération PDF' });
    }
  }

  async createPayroll(req, res) {
    try {
      const { cfg, igr, riskBands } = await this.loadParams();
      const {
        employeId,
        periode, // ex: 2026-02
        mois,
        annee,
        baseSalaire,
        heuresSup = 0,                 // montant direct
        heuresSupDetails = [],         // [{hours, rate}] où rate = 1.5 (50% majoration)
        primes = 0,
        indemnite = 0,
        autresRetenues = 0,
        deductions = [],
        devise = 'XOF',
        statut = 'GENERE',
        partsFiscales,
        cnpsAT, // override
      } = req.body;

      if (!employeId || !baseSalaire || !mois || !annee) {
        return res.status(400).json({ success: false, message: 'employeId, baseSalaire, mois, annee sont requis' });
      }

      const employe = await prisma.employe.findUnique({ where: { id: employeId } });

      // parts fiscales max 5
      const parts = Math.min(Math.max(parseInt(partsFiscales || employe?.partsFiscales || 1, 10), 1), 5);

      // récupérer le contrat actif pour le taux AT s'il existe
      let cnpsATValue = cnpsAT;
      const lastContract = await prisma.contrat.findFirst({
        where: { employeId, statut: 'ACTIF' },
        orderBy: { dateDebut: 'desc' },
        include: { riskBand: true },
      });
      if (lastContract?.cnpsAT) cnpsATValue = parseFloat(lastContract.cnpsAT);
      if (!cnpsATValue && lastContract?.riskBand) cnpsATValue = parseFloat(lastContract.riskBand.rate);
      if (!cnpsATValue && lastContract?.departement) {
        const rb = riskBands.find(r => r.departement?.toLowerCase() === lastContract.departement.toLowerCase());
        if (rb) cnpsATValue = parseFloat(rb.rate);
      }
      if (!cnpsATValue) cnpsATValue = cfg.CNPS_AT;

      const loans = await prisma.loan.findMany({
        where: { employeId, statut: 'EN_COURS' },
      });

      const amounts = this.computePayrollAmounts({
        baseSalaire,
        heuresSup,
        heuresSupDetails,
        primes,
        indemnite,
        autresRetenues,
        deductions,
        parts,
        cnpsATValue,
        employe,
      }, cfg, igr, riskBands);

      // Déductions prêts/avances
      let loanDeduction = 0;
      loans.forEach((l) => {
        const mensualite = Math.min(parseFloat(l.deductionMensuelle || 0), parseFloat(l.restantDu || 0));
        loanDeduction += mensualite;
      });

      const netAPayerAvecLoans = amounts.netAPayer - loanDeduction;
      const deductionsTotalAvecLoans = amounts.deductionsTotal + loanDeduction;

      const payroll = await prisma.payroll.create({
        data: {
          employeId,
          periode: periode || `${annee}-${String(mois).padStart(2, '0')}`,
          mois: parseInt(mois, 10),
          annee: parseInt(annee, 10),
          devise,
          baseSalaire: amounts.base,
          heuresSup,
          heuresSupDetails,
          primes,
          indemnite,
          autresRetenues: parseFloat(autresRetenues || 0) + loanDeduction,
          deductions,
          partsFiscales: parts,
          brut: amounts.brut,
          cnpsSalarial: amounts.cnps.employeeRet + amounts.cnam.salarial,
          cnpsPatronal: amounts.cnps.employerRet + amounts.cnps.employerFamily + amounts.cnps.employerAT + amounts.cnam.employer,
          cnpsATUtilise: amounts.cnps.employerAT,
          cnam: amounts.cnam.salarial + amounts.cnam.employer,
          fdfp: amounts.fdfp,
          igr: amounts.igrAmount,
          cotisationsSalariales: amounts.cotSal,
          cotisationsPatronales: amounts.cotPat,
          netImposable: amounts.taxableAfterAbattement,
          netAPayer: netAPayerAvecLoans,
          statut,
          details: {
            params: { ...cfg, igr },
            breakdown: {
              cnps: {
                employeeRet: amounts.cnps.employeeRet,
                employerRet: amounts.cnps.employerRet,
                employerFamily: amounts.cnps.employerFamily,
                employerAT: amounts.cnps.employerAT,
              },
              cnam: amounts.cnam,
              fdfp: amounts.fdfp,
              isAmount: amounts.isAmount,
              asAmount: amounts.asAmount,
              abattement: amounts.abattement,
              brut: amounts.brut,
              taxableBeforeAbattement: amounts.brut - amounts.cotSal,
              taxableAfterAbattement: amounts.taxableAfterAbattement,
              parts,
              igr: amounts.igrAmount,
              deductionsTotal: deductionsTotalAvecLoans,
              autresRetenues: amounts.autresRet + loanDeduction,
              ayantsDroit: amounts.ayantsDroit,
              loans: loans.map(l => ({ id: l.id, deduction: Math.min(parseFloat(l.deductionMensuelle || 0), parseFloat(l.restantDu || 0)) })),
            },
          },
        },
      });

      // Mettre à jour les prêts (restant dû, statut)
      await Promise.all(loans.map(l => {
        const mensualite = Math.min(parseFloat(l.deductionMensuelle || 0), parseFloat(l.restantDu || 0));
        const nouveauRestant = parseFloat(l.restantDu || 0) - mensualite;
        return prisma.loan.update({
          where: { id: l.id },
          data: {
            restantDu: nouveauRestant,
            statut: nouveauRestant <= 0 ? 'TERMINE' : l.statut,
          },
        });
      }));

      res.status(201).json({ success: true, data: payroll });
    } catch (error) {
      console.error('Error creating payroll:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la création du bulletin', error: error.message });
    }
  }

  async updatePayroll(req, res) {
    try {
      const id = req.params.id;
      const existing = await prisma.payroll.findUnique({
        where: { id },
        include: { employe: true },
      });
      if (!existing) return res.status(404).json({ success: false, message: 'Bulletin non trouvé' });

      const primes = req.body.primes !== undefined ? Number(req.body.primes) : Number(existing.primes || 0);
      const indemnite =
        req.body.indemnite !== undefined ? Number(req.body.indemnite) : Number(existing.indemnite || 0);
      const autresRetenues =
        req.body.autresRetenues !== undefined ? Number(req.body.autresRetenues) : Number(existing.autresRetenues || 0);
      const heuresSup = req.body.heuresSup !== undefined ? Number(req.body.heuresSup) : Number(existing.heuresSup || 0);
      const heuresSupDetails = Array.isArray(req.body.heuresSupDetails) ? req.body.heuresSupDetails : [];

      const { cfg, igr, riskBands } = await this.loadParams();
      const cnpsATValue =
        existing.cnpsATUtilise ||
        existing.cnpsAT ||
        riskBands.find((r) => r.departement?.toLowerCase() === existing.employe.departement?.toLowerCase())?.rate ||
        cfg.CNPS_AT;

      const amounts = this.computePayrollAmounts(
        {
          baseSalaire: Number(existing.baseSalaire || 0),
          primes,
          indemnite,
          autresRetenues,
          deductions: existing.deductions || [],
          parts: Math.min(Math.max(existing.partsFiscales || 1, 1), 5),
          cnpsATValue,
          employe: existing.employe,
          heuresSup,
          heuresSupDetails,
        },
        cfg,
        igr,
        riskBands
      );

      const dataUpdate = {
        ...req.body,
        primes,
        indemnite,
        autresRetenues,
        heuresSup,
        deductions: existing.deductions || [],
        brut: amounts.brut,
        cnpsSalarial: amounts.cotSal,
        cnpsPatronal: amounts.cotPat,
        cnpsATUtilise: amounts.cnps.employerAT,
        cnam: amounts.cnam.salarial + amounts.cnam.employer,
        fdfp: amounts.fdfp,
        igr: amounts.igrAmount,
        cotisationsSalariales: amounts.cotSal,
        cotisationsPatronales: amounts.cotPat,
        netImposable: amounts.taxableAfterAbattement,
        netAPayer: amounts.netAPayer,
      };

      const payroll = await prisma.payroll.update({
        where: { id },
        data: dataUpdate,
      });
      res.json({ success: true, data: payroll });
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Bulletin non trouvé' });
      console.error('Error updating payroll:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du bulletin', error: error.message });
    }
  }

  async deletePayroll(req, res) {
    try {
      await prisma.payroll.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Bulletin non trouvé' });
      console.error('Error deleting payroll:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression du bulletin', error: error.message });
    }
  }

  async generatePayslip(req, res) {
    // Génère à partir du dernier contrat actif
    try {
      const { employeId, mois, annee } = req.body;
      if (!employeId || !mois || !annee) {
        return res.status(400).json({ success: false, message: 'employeId, mois, annee sont requis' });
      }

      const contrat = await prisma.contrat.findFirst({
        where: { employeId, statut: 'ACTIF' },
        orderBy: { dateDebut: 'desc' },
      });

      if (!contrat) {
        return res.status(404).json({ success: false, message: 'Aucun contrat actif trouvé pour cet employé' });
      }

      req.body.baseSalaire = contrat.salaireBase;
      req.body.periode = `${annee}-${String(mois).padStart(2, '0')}`;
      return this.createPayroll(req, res);
    } catch (error) {
      console.error('Error generating payslip:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la génération du bulletin', error: error.message });
    }
  }

  async generateAllCurrent(req, res) {
    try {
      const { cfg, igr, riskBands } = await this.loadParams();
      const now = new Date();
      const mois = parseInt(req.body?.mois || (now.getMonth() + 1), 10);
      const annee = parseInt(req.body?.annee || now.getFullYear(), 10);

      const employes = await prisma.employe.findMany({
        where: { status: 'ACTIF' },
        include: {
          contrats: {
            where: { statut: 'ACTIF' },
            orderBy: { dateDebut: 'desc' },
            take: 1,
          },
        },
      });

      const created = [];
      for (const emp of employes) {
        const contrat = emp.contrats?.[0];
        if (!contrat) continue;
        const exists = await prisma.payroll.findFirst({
          where: { employeId: emp.id, mois, annee },
        });
        if (exists) continue;

        const cnpsATValue = contrat.cnpsAT || riskBands.find(r => r.departement?.toLowerCase() === contrat.departement.toLowerCase())?.rate || cfg.CNPS_AT;
        const loans = await prisma.loan.findMany({ where: { employeId: emp.id, statut: 'EN_COURS' } });
        const amounts = this.computePayrollAmounts({
          baseSalaire: contrat.salaireBase,
          primes: 0,
          indemnite: 0,
          autresRetenues: 0,
          deductions: [],
          parts: Math.min(Math.max(emp.partsFiscales || 1, 1), 5),
          cnpsATValue,
          employe: emp,
        }, cfg, igr, riskBands);

        let loanDeduction = 0;
        loans.forEach(l => {
          const mensualite = Math.min(parseFloat(l.deductionMensuelle || 0), parseFloat(l.restantDu || 0));
          loanDeduction += mensualite;
        });
        const netAPayerAvecLoans = amounts.netAPayer - loanDeduction;

        const payroll = await prisma.payroll.create({
          data: {
            employeId: emp.id,
            periode: `${annee}-${String(mois).padStart(2, '0')}`,
            mois,
            annee,
            devise: 'XOF',
            baseSalaire: amounts.base,
            heuresSup: 0,
        // heuresSupDetails intentionally omitted (column absent in current schema)
        primes: 0,
        indemnite: 0,
        autresRetenues: 0,
        deductions: [],
            partsFiscales: Math.min(Math.max(emp.partsFiscales || 1, 1), 5),
            brut: amounts.brut,
            cnpsSalarial: amounts.cnps.employeeRet + amounts.cnam.salarial,
            cnpsPatronal: amounts.cnps.employerRet + amounts.cnps.employerFamily + amounts.cnps.employerAT + amounts.cnam.employer,
            cnpsATUtilise: amounts.cnps.employerAT,
            cnam: amounts.cnam.salarial + amounts.cnam.employer,
            fdfp: amounts.fdfp,
            igr: amounts.igrAmount,
            cotisationsSalariales: amounts.cotSal,
            cotisationsPatronales: amounts.cotPat,
            netImposable: amounts.taxableAfterAbattement,
            netAPayer: netAPayerAvecLoans,
            statut: 'GENERE',
          },
        });
        // update loans
        await Promise.all(loans.map(l => {
          const mensualite = Math.min(parseFloat(l.deductionMensuelle || 0), parseFloat(l.restantDu || 0));
          const nouveauRestant = parseFloat(l.restantDu || 0) - mensualite;
          return prisma.loan.update({
            where: { id: l.id },
            data: {
              restantDu: nouveauRestant,
              statut: nouveauRestant <= 0 ? 'TERMINE' : l.statut,
            },
          });
        }));
        created.push(payroll);
      }

      res.json({ success: true, data: { created: created.length } });
    } catch (error) {
      console.error('Error generating all payslips:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la génération groupée', error: error.message });
    }
  }
}

module.exports = new PayrollController();
