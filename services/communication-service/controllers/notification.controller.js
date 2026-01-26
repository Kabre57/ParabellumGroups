const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const notificationController = {
  // Créer une notification
  async create(req, res) {
    try {
      const notification = await prisma.notification.create({
        data: req.body
      });
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir les notifications d'un utilisateur
  async getByUser(req, res) {
    try {
      const { userId } = req.params;
      const { lue } = req.query;
      
      const where = { userId };
      if (lue !== undefined) where.lue = lue === 'true';

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { dateCreation: 'desc' }
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Marquer une notification comme lue
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await prisma.notification.update({
        where: { id },
        data: {
          lue: true,
          dateLu: new Date()
        }
      });
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Supprimer les notifications lues
  async deleteRead(req, res) {
    try {
      const { userId } = req.params;
      const result = await prisma.notification.deleteMany({
        where: {
          userId,
          lue: true
        }
      });
      res.json({ deleted: result.count });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Supprimer une notification
  async delete(req, res) {
    try {
      await prisma.notification.delete({
        where: { id: req.params.id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = notificationController;
