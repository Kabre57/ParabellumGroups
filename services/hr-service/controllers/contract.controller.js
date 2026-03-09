const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ContractController {
  async getAllContracts(req, res) {
    try {
      const { page = 1, pageSize = 20, search, status, employeeId } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
      const take = parseInt(pageSize, 10);

      const where = {};
      if (status) where.statut = status;
      if (employeeId) where.employeId = employeeId;
      if (search) {
        where.OR = [
          { poste: { contains: search, mode: 'insensitive' } },
          { departement: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [contrats, total] = await Promise.all([
        prisma.contrat.findMany({
          where,
          skip,
          take,
          include: {
            employe: { select: { id: true, nom: true, prenom: true, matricule: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.contrat.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          data: contrats,
          total,
          page: parseInt(page, 10),
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des contrats',
        error: error.message,
      });
    }
  }

  async getContract(req, res) {
    try {
      const contrat = await prisma.contrat.findUnique({
        where: { id: req.params.id },
        include: {
          employe: { select: { id: true, nom: true, prenom: true, matricule: true, email: true } },
        },
      });

      if (!contrat) {
        return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
      }
      return res.json({ success: true, data: contrat });
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du contrat',
        error: error.message,
      });
    }
  }

  async createContract(req, res) {
    try {
      const {
        employeId,
        type,
        dateDebut,
        dateFin,
        poste,
        departement,
        salaireBase,
        devise = 'XOF',
        heuresHebdo,
        statut,
        cnpsTauxSalarie,
        cnpsTauxEmployeur,
        cnamTauxEmployeur,
        riskBandId,
        autresAvantages,
        clauses,
      } = req.body;

      if (!employeId || !type || !dateDebut || !poste || !departement || !salaireBase) {
        return res.status(400).json({ success: false, message: 'Champs requis manquants' });
      }

      const contrat = await prisma.contrat.create({
        data: {
          employeId,
          type,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          poste,
          departement,
          salaireBase,
          devise,
          heuresHebdo,
          statut: statut || 'ACTIF',
          cnpsTauxSalarie,
          cnpsTauxEmployeur,
          cnamTauxEmployeur,
          riskBandId,
          autresAvantages,
          clauses,
        },
      });

      // Synchroniser le type de contrat sur la fiche employé pour l'affichage RH
      await prisma.employe.update({
        where: { id: employeId },
        data: { categorie: type },
      });

      return res.status(201).json({ success: true, data: contrat });
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du contrat',
        error: error.message,
      });
    }
  }

  async updateContract(req, res) {
    try {
      const data = { ...req.body };
      if (data.dateDebut) data.dateDebut = new Date(data.dateDebut);
      if (data.dateFin) data.dateFin = new Date(data.dateFin);

      const contrat = await prisma.contrat.update({
        where: { id: req.params.id },
        data,
      });

      // Si on modifie le type ou qu'on valide le contrat, mettre à jour la catégorie employé
      if (data.type || data.statut) {
        const typeToSet = data.type || contrat.type;
        const statut = data.statut || contrat.statut;
        if (statut !== 'TERMINE' && statut !== 'RESILIE') {
          await prisma.employe.update({
            where: { id: contrat.employeId },
            data: { categorie: typeToSet },
          });
        }
      }

      return res.json({ success: true, data: contrat });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
      }
      console.error('Error updating contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du contrat',
        error: error.message,
      });
    }
  }

  async deleteContract(req, res) {
    try {
      await prisma.contrat.delete({ where: { id: req.params.id } });
      return res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
      }
      console.error('Error deleting contract:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du contrat',
        error: error.message,
      });
    }
  }

  async getEmployeeContracts(req, res) {
    try {
      const contrats = await prisma.contrat.findMany({
        where: { employeId: req.params.employeeId },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: contrats });
    } catch (error) {
      console.error('Error fetching employee contracts:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des contrats de l\'employé',
        error: error.message,
      });
    }
  }

  async getContractPdf(req, res) {
    try {
      const contrat = await prisma.contrat.findUnique({
        where: { id: req.params.id },
        include: {
          employe: { select: { nom: true, prenom: true, matricule: true, departement: true, email: true } },
        },
      });
      if (!contrat) return res.status(404).json({ success: false, message: 'Contrat non trouvé' });

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
            <h1>Contrat de travail</h1>
            <div>Employé : ${contrat.employe?.prenom || ''} ${contrat.employe?.nom || ''} (${contrat.employe?.matricule || ''})</div>
            <div>Poste : ${contrat.poste}</div>
            <div>Département : ${contrat.departement}</div>
            <table>
              <tr><th>Type</th><td>${contrat.type}</td></tr>
              <tr><th>Début</th><td>${contrat.dateDebut}</td></tr>
              <tr><th>Fin</th><td>${contrat.dateFin || '-'}</td></tr>
              <tr><th>Salaire</th><td>${contrat.salaireBase} ${contrat.devise}</td></tr>
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
      res.setHeader('Content-Disposition', `attachment; filename="contrat-${contrat.id}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      return res.status(500).json({ success: false, message: 'Erreur génération PDF' });
    }
  }
}

module.exports = new ContractController();
