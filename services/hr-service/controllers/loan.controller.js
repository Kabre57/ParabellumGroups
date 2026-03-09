const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LoanController {
  async list(req, res) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where = {};
      if (status) where.statut = status;
      if (search) {
        where.OR = [
          { motif: { contains: search, mode: 'insensitive' } },
          { employe: { nom: { contains: search, mode: 'insensitive' } } },
          { employe: { prenom: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.loan.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          orderBy: { createdAt: 'desc' },
          include: { employe: { select: { id: true, nom: true, prenom: true, departement: true } } },
        }),
        prisma.loan.count({ where }),
      ]);

      res.json({
        data: rows,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
      });
    } catch (error) {
      console.error('Error listing loans:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des avances/prêts', error: error.message });
    }
  }

  async get(req, res) {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: req.params.id },
        include: { employe: true },
      });
      if (!loan) return res.status(404).json({ success: false, message: 'Avance/Prêt introuvable' });
      res.json({ success: true, data: loan });
    } catch (error) {
      console.error('Error fetching loan:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération', error: error.message });
    }
  }

  async create(req, res) {
    try {
      const {
        employeId,
        type,
        motif,
        montantInitial,
        deductionMensuelle,
        dateDebut,
        dateFin,
      } = req.body;

      if (!employeId || !type || !montantInitial || !deductionMensuelle || !dateDebut) {
        return res.status(400).json({ success: false, message: 'employeId, type, montantInitial, deductionMensuelle, dateDebut sont requis' });
      }

      const loan = await prisma.loan.create({
        data: {
          employeId,
          type,
          motif,
          montantInitial: parseFloat(montantInitial),
          restantDu: parseFloat(montantInitial),
          deductionMensuelle: parseFloat(deductionMensuelle),
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
        },
      });

      res.status(201).json({ success: true, data: loan });
    } catch (error) {
      console.error('Error creating loan:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la création', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const loan = await prisma.loan.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: loan });
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Avance/Prêt introuvable' });
      console.error('Error updating loan:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour', error: error.message });
    }
  }

  async terminate(req, res) {
    try {
      const loan = await prisma.loan.update({
        where: { id: req.params.id },
        data: { statut: 'TERMINE', restantDu: 0 },
      });
      res.json({ success: true, data: loan });
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Avance/Prêt introuvable' });
      console.error('Error terminating loan:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la clôture', error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await prisma.loan.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Avance/Prêt introuvable' });
      console.error('Error deleting loan:', error);
      res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: error.message });
    }
  }
}

module.exports = new LoanController();
