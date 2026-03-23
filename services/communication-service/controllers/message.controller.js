const { PrismaClient } = require('@prisma/client');
const emailSender = require('../utils/emailSender');
const emitter = require('../emitter');
const prisma = new PrismaClient();

const MESSAGE_TYPES = new Set(['EMAIL', 'SMS', 'NOTIFICATION']);

const messageController = {
  // Créer un message
  async create(req, res) {
    try {
      const expediteurId = req.body?.expediteurId != null ? String(req.body.expediteurId).trim() : '';
      const destinataireId = req.body?.destinataireId != null ? String(req.body.destinataireId).trim() : '';
      const sujet = req.body?.sujet != null ? String(req.body.sujet).trim() : '';
      const contenu = req.body?.contenu != null ? String(req.body.contenu).trim() : '';
      const type = req.body?.type ? String(req.body.type).toUpperCase() : 'NOTIFICATION';
      const pieceJointe = Array.isArray(req.body?.pieceJointe) ? req.body.pieceJointe : [];

      if (!expediteurId || !destinataireId || !sujet || !contenu) {
        return res.status(400).json({ error: 'expediteurId, destinataireId, sujet et contenu sont requis' });
      }

      if (!MESSAGE_TYPES.has(type)) {
        return res.status(400).json({ error: 'Type de message invalide' });
      }

      const message = await prisma.message.create({
        data: {
          expediteurId,
          destinataireId,
          sujet,
          contenu,
          type,
          pieceJointe,
        }
      });
      emitter.emit('message', { destinataireId, message });
      res.status(201).json(message);
    } catch (error) {
      console.error('Erreur creation message:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir tous les messages
  async getAll(req, res) {
    try {
      const { expediteurId, destinataireId, type, status } = req.query;
      const where = {};
      
      if (expediteurId) where.expediteurId = expediteurId;
      if (destinataireId) where.destinataireId = destinataireId;
      if (type) where.type = type;
      if (status) where.status = status;

      const messages = await prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir un message par ID
  async getById(req, res) {
    try {
      const message = await prisma.message.findUnique({
        where: { id: req.params.id }
      });
      if (!message) {
        return res.status(404).json({ error: 'Message non trouvé' });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Mettre à jour un message
  async update(req, res) {
    try {
      const message = await prisma.message.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Supprimer un message
  async delete(req, res) {
    try {
      await prisma.message.delete({
        where: { id: req.params.id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Envoyer un message
  async send(req, res) {
    try {
      const { id } = req.params;
      const message = await prisma.message.findUnique({
        where: { id }
      });

      if (!message) {
        return res.status(404).json({ error: 'Message non trouvé' });
      }

      // Envoyer l'email si type EMAIL
      if (message.type === 'EMAIL') {
        await emailSender.sendEmail({
          to: message.destinataireId,
          subject: message.sujet,
          text: message.contenu,
          attachments: message.pieceJointe
        });
      }

      // Mettre à jour le statut
      const updatedMessage = await prisma.message.update({
        where: { id },
        data: {
          status: 'ENVOYE',
          dateEnvoi: new Date()
        }
      });

      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Marquer comme lu
  async markAsRead(req, res) {
    try {
      const message = await prisma.message.update({
        where: { id: req.params.id },
        data: {
          status: 'LU',
          dateLu: new Date()
        }
      });
      emitter.emit('message', { destinataireId: message.destinataireId, message });
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Archiver un message
  async archive(req, res) {
    try {
      const message = await prisma.message.update({
        where: { id: req.params.id },
        data: {
          status: 'ARCHIVE'
        }
      });
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = messageController;
