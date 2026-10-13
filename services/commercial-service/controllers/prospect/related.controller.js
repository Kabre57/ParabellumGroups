// Gestion des documents, objectifs et informations associées.
const { prisma, getUserId } = require('./shared');

exports.getDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const where = { prospectId: id };
    if (type) {
      where.type = type.toUpperCase();
    }

    const documents = await prisma.documentProspect.findMany({
      where,
      orderBy: { uploadedAt: 'desc' }
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des documents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const documentData = {
      prospectId: id,
      ...req.body,
      uploadedById: userId,
      uploadedAt: new Date()
    };

    const document = await prisma.documentProspect.create({
      data: documentData
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploadé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload du document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCompetitors = async (req, res) => {
  try {
    const { id } = req.params;

    const competitors = await prisma.competitorProspect.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des concurrents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des concurrents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addCompetitor = async (req, res) => {
  try {
    const { id } = req.params;

    const competitor = await prisma.competitorProspect.create({
      data: {
        prospectId: id,
        ...req.body
      }
    });

    res.status(201).json({
      success: true,
      data: competitor,
      message: 'Concurrent ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du concurrent:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du concurrent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const history = await prisma.prospectHistory.findMany({
      where: { prospectId: id },
      orderBy: { changedAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTargets = async (req, res) => {
  try {
    const { period = 'MONTHLY', userId, teamId, year } = req.query;

    const where = {
      period: period.toUpperCase(),
      isActive: true
    };

    if (userId) where.userId = userId;
    if (teamId) where.teamId = teamId;
    if (year) where.year = parseInt(year);

    const targets = await prisma.salesTarget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des objectifs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des objectifs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Calculer le taux de complétion
    if (updateData.actualRevenue !== undefined && updateData.targetRevenue) {
      updateData.completionRate = (updateData.actualRevenue / updateData.targetRevenue) * 100;
    }

    const target = await prisma.salesTarget.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: target,
      message: 'Objectif mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'objectif:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'objectif',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const where = { prospectId: id };
    if (type) {
      where.type = type.toUpperCase();
    }

    const notes = await prisma.noteProspect.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const note = await prisma.noteProspect.create({
      data: {
        prospectId: id,
        ...req.body,
        createdById: userId
      }
    });

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note ajoutée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { type, isActive } = req.query;

    const where = {};
    if (type) where.type = type.toUpperCase();
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const userId = getUserId(req);
    const template = await prisma.emailTemplate.create({
      data: {
        ...req.body,
        createdById: userId
      }
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du template:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
