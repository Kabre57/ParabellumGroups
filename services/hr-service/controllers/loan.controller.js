const { PrismaClient } = require('@prisma/client');
const { createCrudController } = require('../utils/crudFactory');

const prisma = new PrismaClient();

const controller = createCrudController({
  model: 'pretAvance',
  idField: 'id',
  idType: 'int',
  filters: ['matricule', 'statut'],
  include: { employe: true },
});

const mapLoanPayload = (payload) => ({
  matricule: payload.employeId ?? payload.matricule,
  datePret: payload.datePret ? new Date(payload.datePret) : payload.dateDebut ? new Date(payload.dateDebut) : undefined,
  montantTotalPrete: payload.montantInitial ?? payload.montantTotalPrete,
  montantRestantDu: payload.restantDu ?? payload.montantRestantDu,
  nombreMoisRemboursement: payload.nombreMoisRemboursement ?? payload.nombreMois,
  mensualiteRetenue: payload.deductionMensuelle ?? payload.mensualiteRetenue,
  dateDebutRemboursement: payload.dateDebut ? new Date(payload.dateDebut) : payload.dateDebutRemboursement,
  dateFinRemboursement: payload.dateFin ? new Date(payload.dateFin) : payload.dateFinRemboursement,
  nombreMoisPayes: payload.nombreMoisPayes,
  statut: payload.statut ?? payload.status,
  motifPret: payload.motif ?? payload.motifPret,
});

controller.create = async (req, res) => {
  try {
    const created = await prisma.pretAvance.create({
      data: mapLoanPayload(req.body),
      include: { employe: true },
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

controller.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.pretAvance.update({
      where: { id },
      data: mapLoanPayload(req.body),
      include: { employe: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

controller.terminate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.pretAvance.update({
      where: { id },
      data: { statut: 'TERMINE' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = controller;
