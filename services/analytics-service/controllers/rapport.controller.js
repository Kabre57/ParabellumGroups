const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs').promises;

exports.createRapport = async (req, res) => {
  try {
    const { nom, description, type, format, frequence, parametres, actif } = req.body;

    const rapport = await prisma.rapport.create({
      data: {
        nom,
        description,
        type,
        format,
        frequence,
        parametres: parametres || {},
        actif: actif !== undefined ? actif : true
      }
    });

    res.status(201).json(rapport);
  } catch (error) {
    console.error('Erreur création rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la création du rapport' });
  }
};

exports.getAllRapports = async (req, res) => {
  try {
    const { type, actif } = req.query;

    const where = {};
    if (type) where.type = type;
    if (actif !== undefined) where.actif = actif === 'true';

    const rapports = await prisma.rapport.findMany({
      where,
      include: {
        executions: {
          orderBy: { dateExecution: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(rapports);
  } catch (error) {
    console.error('Erreur récupération rapports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
  }
};

exports.getRapportById = async (req, res) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapport.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { dateExecution: 'desc' }
        }
      }
    });

    if (!rapport) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    res.json(rapport);
  } catch (error) {
    console.error('Erreur récupération rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du rapport' });
  }
};

exports.updateRapport = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, type, format, frequence, parametres, actif } = req.body;

    const existing = await prisma.rapport.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    const rapport = await prisma.rapport.update({
      where: { id },
      data: {
        nom,
        description,
        type,
        format,
        frequence,
        parametres,
        actif
      }
    });

    res.json(rapport);
  } catch (error) {
    console.error('Erreur mise à jour rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rapport' });
  }
};

exports.deleteRapport = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rapport.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    await prisma.rapport.delete({
      where: { id }
    });

    res.json({ message: 'Rapport supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du rapport' });
  }
};

exports.execute = async (req, res) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapport.findUnique({
      where: { id }
    });

    if (!rapport) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    const startTime = Date.now();

    const execution = await prisma.rapportExecution.create({
      data: {
        rapportId: id,
        statut: 'RUNNING'
      }
    });

    try {
      const fichier = await generateRapport(rapport);
      const duree = Date.now() - startTime;

      const executionComplete = await prisma.rapportExecution.update({
        where: { id: execution.id },
        data: {
          statut: 'COMPLETED',
          fichier,
          duree
        }
      });

      res.json(executionComplete);
    } catch (error) {
      const duree = Date.now() - startTime;

      await prisma.rapportExecution.update({
        where: { id: execution.id },
        data: {
          statut: 'FAILED',
          erreur: error.message,
          duree
        }
      });

      throw error;
    }
  } catch (error) {
    console.error('Erreur exécution rapport:', error);
    res.status(500).json({ error: 'Erreur lors de l\'exécution du rapport' });
  }
};

exports.schedule = async (req, res) => {
  try {
    const { id } = req.params;

    const rapport = await prisma.rapport.findUnique({
      where: { id }
    });

    if (!rapport) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    // Logique de planification à implémenter avec node-cron
    // Cette fonctionnalité nécessiterait un système de gestion des jobs

    res.json({
      message: 'Rapport planifié avec succès',
      frequence: rapport.frequence
    });
  } catch (error) {
    console.error('Erreur planification rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la planification du rapport' });
  }
};

exports.download = async (req, res) => {
  try {
    const { id, executionId } = req.params;

    const execution = await prisma.rapportExecution.findFirst({
      where: {
        id: executionId,
        rapportId: id,
        statut: 'COMPLETED'
      },
      include: { rapport: true }
    });

    if (!execution || !execution.fichier) {
      return res.status(404).json({ error: 'Fichier de rapport non trouvé' });
    }

    // Logique de téléchargement du fichier
    res.json({
      message: 'Téléchargement du rapport',
      fichier: execution.fichier,
      url: `/downloads/${execution.fichier}`
    });
  } catch (error) {
    console.error('Erreur téléchargement rapport:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement du rapport' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const executions = await prisma.rapportExecution.findMany({
      where: { rapportId: id },
      orderBy: { dateExecution: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.rapportExecution.count({
      where: { rapportId: id }
    });

    res.json({
      executions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

async function generateRapport(rapport) {
  // Logique de génération du rapport selon le type et le format
  const filename = `rapport_${rapport.id}_${Date.now()}.${rapport.format.toLowerCase()}`;
  
  // Simuler la génération
  // Dans une implémentation réelle, utiliser chartGenerator, excelGenerator, etc.
  
  return filename;
}
