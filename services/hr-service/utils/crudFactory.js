const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const parseIdValue = (value, type) => {
  if (type === 'int') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
};

const buildWhere = (query, allowedFilters) => {
  const where = {};
  allowedFilters.forEach((key) => {
    if (query[key] !== undefined && query[key] !== '') {
      where[key] = query[key];
    }
  });
  return where;
};

const createCrudController = ({
  model,
  idField = 'id',
  idType = 'int',
  filters = [],
  include,
}) => ({
  async list(req, res) {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || req.query.limit || 50);
      const where = buildWhere(req.query, filters);
      const [items, total] = await Promise.all([
        prisma[model].findMany({
          where,
          include,
          orderBy: { [idField]: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma[model].count({ where }),
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

  async get(req, res) {
    try {
      const idValue = parseIdValue(req.params.id, idType);
      if (idValue === null) {
        return res.status(400).json({ error: 'Identifiant invalide' });
      }
      const item = await prisma[model].findUnique({
        where: { [idField]: idValue },
        include,
      });
      if (!item) {
        return res.status(404).json({ error: 'Enregistrement non trouvé' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const created = await prisma[model].create({ data: req.body });
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const idValue = parseIdValue(req.params.id, idType);
      if (idValue === null) {
        return res.status(400).json({ error: 'Identifiant invalide' });
      }
      const updated = await prisma[model].update({
        where: { [idField]: idValue },
        data: req.body,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async remove(req, res) {
    try {
      const idValue = parseIdValue(req.params.id, idType);
      if (idValue === null) {
        return res.status(400).json({ error: 'Identifiant invalide' });
      }
      await prisma[model].delete({ where: { [idField]: idValue } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
});

module.exports = { createCrudController };
