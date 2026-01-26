const { PrismaClient } = require('@prisma/client');
const templateParser = require('../utils/templateParser');
const prisma = new PrismaClient();

const templateController = {
  // Créer un template
  async create(req, res) {
    try {
      const template = await prisma.template.create({
        data: req.body
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir tous les templates
  async getAll(req, res) {
    try {
      const { type, actif } = req.query;
      const where = {};
      
      if (type) where.type = type;
      if (actif !== undefined) where.actif = actif === 'true';

      const templates = await prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir un template par ID
  async getById(req, res) {
    try {
      const template = await prisma.template.findUnique({
        where: { id: req.params.id }
      });
      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Mettre à jour un template
  async update(req, res) {
    try {
      const template = await prisma.template.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Supprimer un template
  async delete(req, res) {
    try {
      await prisma.template.delete({
        where: { id: req.params.id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Prévisualiser un template avec des variables
  async preview(req, res) {
    try {
      const { id } = req.params;
      const { variables } = req.body;

      const template = await prisma.template.findUnique({
        where: { id }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      const preview = {
        sujet: templateParser.parse(template.sujet, variables),
        contenu: templateParser.parse(template.contenu, variables)
      };

      res.json(preview);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Dupliquer un template
  async duplicate(req, res) {
    try {
      const { id } = req.params;
      const original = await prisma.template.findUnique({
        where: { id }
      });

      if (!original) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      const { id: _, createdAt, updatedAt, ...templateData } = original;
      const duplicate = await prisma.template.create({
        data: {
          ...templateData,
          nom: `${original.nom} (copie)`
        }
      });

      res.status(201).json(duplicate);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = templateController;
