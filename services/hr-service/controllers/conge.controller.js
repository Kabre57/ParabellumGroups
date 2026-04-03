const { PrismaClient } = require('@prisma/client');
const { createCrudController } = require('../utils/crudFactory');

const prisma = new PrismaClient();

const controller = createCrudController({
  model: 'gestionConge',
  idField: 'id',
  idType: 'int',
  filters: ['matricule', 'typeConge', 'statut'],
  include: { employe: true },
});

controller.approve = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.gestionConge.update({
      where: { id },
      data: {
        statut: 'APPROUVE',
        dateApprobation: new Date(),
        observations: req.body?.commentaire,
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

controller.reject = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.gestionConge.update({
      where: { id },
      data: {
        statut: 'REFUSE',
        observations: req.body?.commentaire,
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

controller.getSolde = async (req, res) => {
  try {
    const matricule = req.params.employeId;
    const conges = await prisma.gestionConge.findMany({ where: { matricule } });
    const total = conges.reduce((sum, row) => sum + Number(row.nombreJours || 0), 0);
    res.json({
      success: true,
      data: {
        employeId: matricule,
        annuel: 0,
        maladie: 0,
        sanssolde: 0,
        pris: { annuel: total, maladie: 0, sanssolde: 0 },
        restant: { annuel: 0, maladie: 0, sanssolde: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

controller.getCalendrier = async (req, res) => {
  try {
    const items = await prisma.gestionConge.findMany({ include: { employe: true } });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = controller;
