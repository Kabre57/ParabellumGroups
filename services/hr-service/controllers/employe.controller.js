const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const buildSearchWhere = (query) => {
  if (!query) return undefined;
  const q = String(query).trim();
  if (!q) return undefined;
  return {
    OR: [
      { matricule: { contains: q, mode: 'insensitive' } },
      { nom: { contains: q, mode: 'insensitive' } },
      { prenoms: { contains: q, mode: 'insensitive' } },
      { emailPersonnel: { contains: q, mode: 'insensitive' } },
    ],
  };
};

const employeController = {
  async getAll(req, res) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || req.query.limit || 50);
      const where = {
        ...buildSearchWhere(req.query.search || req.query.query),
        ...(req.query.statut ? { statut: req.query.statut } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.employe.findMany({
          where,
          orderBy: { dateCreation: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.employe.count({ where }),
      ]);
      res.json({
        data: items,
        currentPage: page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const employe = await prisma.employe.findUnique({
        where: { matricule: req.params.id },
      });
      if (!employe) {
        return res.status(404).json({ error: 'Employe non trouvé' });
      }
      res.json(employe);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      if (!req.body?.matricule) {
        return res.status(400).json({ error: 'Matricule requis' });
      }
      const employe = await prisma.employe.create({ data: req.body });
      res.status(201).json(employe);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const employe = await prisma.employe.update({
        where: { matricule: req.params.id },
        data: req.body,
      });
      res.json(employe);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      await prisma.employe.delete({ where: { matricule: req.params.id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getStats(req, res) {
    try {
      const total = await prisma.employe.count();
      const actifs = await prisma.employe.count({ where: { statut: 'ACTIF' } });
      res.json({
        total,
        actifs,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getContracts(req, res) {
    try {
      const matricule = req.params.id;
      const contracts = await prisma.contrat.findMany({
        where: { matricule },
        orderBy: { dateDebut: 'desc' },
      });
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = employeController;
