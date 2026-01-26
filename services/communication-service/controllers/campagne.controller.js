const { PrismaClient } = require('@prisma/client');
const emailSender = require('../utils/emailSender');
const templateParser = require('../utils/templateParser');
const prisma = new PrismaClient();

const campagneController = {
  // Créer une campagne
  async create(req, res) {
    try {
      const campagne = await prisma.campagneMail.create({
        data: req.body,
        include: { template: true }
      });
      res.status(201).json(campagne);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir toutes les campagnes
  async getAll(req, res) {
    try {
      const { status } = req.query;
      const where = {};
      
      if (status) where.status = status;

      const campagnes = await prisma.campagneMail.findMany({
        where,
        include: { template: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(campagnes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir une campagne par ID
  async getById(req, res) {
    try {
      const campagne = await prisma.campagneMail.findUnique({
        where: { id: req.params.id },
        include: { template: true }
      });
      if (!campagne) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
      }
      res.json(campagne);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Mettre à jour une campagne
  async update(req, res) {
    try {
      const campagne = await prisma.campagneMail.update({
        where: { id: req.params.id },
        data: req.body,
        include: { template: true }
      });
      res.json(campagne);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Supprimer une campagne
  async delete(req, res) {
    try {
      await prisma.campagneMail.delete({
        where: { id: req.params.id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Programmer une campagne
  async schedule(req, res) {
    try {
      const { id } = req.params;
      const { dateEnvoi } = req.body;

      const campagne = await prisma.campagneMail.update({
        where: { id },
        data: {
          status: 'PROGRAMMEE',
          dateEnvoi: new Date(dateEnvoi)
        },
        include: { template: true }
      });

      res.json(campagne);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Démarrer une campagne
  async start(req, res) {
    try {
      const { id } = req.params;
      
      const campagne = await prisma.campagneMail.findUnique({
        where: { id },
        include: { template: true }
      });

      if (!campagne) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
      }

      // Mettre à jour le statut
      await prisma.campagneMail.update({
        where: { id },
        data: { status: 'EN_COURS' }
      });

      // Envoyer les emails
      let nbEnvoyes = 0;
      let nbErreurs = 0;

      for (const destinataire of campagne.destinataires) {
        try {
          const contenu = templateParser.parse(
            campagne.template.contenu,
            destinataire.variables || {}
          );
          const sujet = templateParser.parse(
            campagne.template.sujet,
            destinataire.variables || {}
          );

          await emailSender.sendEmail({
            to: destinataire.email,
            subject: sujet,
            html: contenu
          });

          nbEnvoyes++;
        } catch (error) {
          nbErreurs++;
        }
      }

      // Mettre à jour les statistiques
      const updatedCampagne = await prisma.campagneMail.update({
        where: { id },
        data: {
          status: 'TERMINEE',
          nbEnvoyes,
          nbErreurs,
          dateEnvoi: new Date()
        },
        include: { template: true }
      });

      res.json(updatedCampagne);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtenir les statistiques d'une campagne
  async getStats(req, res) {
    try {
      const { id } = req.params;
      
      const campagne = await prisma.campagneMail.findUnique({
        where: { id }
      });

      if (!campagne) {
        return res.status(404).json({ error: 'Campagne non trouvée' });
      }

      const stats = {
        nbDestinataires: Array.isArray(campagne.destinataires) 
          ? campagne.destinataires.length 
          : 0,
        nbEnvoyes: campagne.nbEnvoyes,
        nbLus: campagne.nbLus,
        nbErreurs: campagne.nbErreurs,
        tauxEnvoi: campagne.destinataires.length > 0
          ? (campagne.nbEnvoyes / campagne.destinataires.length) * 100
          : 0,
        tauxLecture: campagne.nbEnvoyes > 0
          ? (campagne.nbLus / campagne.nbEnvoyes) * 100
          : 0
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = campagneController;
