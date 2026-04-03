const express = require('express');
const {
  configurationController,
  historiqueEmployeController,
  variablesMensuelleController,
  cumulAnnuelController,
  absenceController,
  gratificationController,
  indemniteRuptureController,
  declarationCnpsController,
  declarationFiscaleController,
  disaController,
  dascController,
  etat301Controller,
  ecritureComptableController,
  provisionRetraiteController,
  provisionCongeController,
  livrePaieMensuelController,
  livrePaieAnnuelController,
  ordreBancaireController,
  detailVirementController,
  statistiqueRhController,
  ruptureContratController,
  certificatTravailController,
} = require('../controllers/logipaie.controller');

const router = express.Router();

const mountCrud = (path, controller) => {
  router.get(`/${path}`, controller.list);
  router.get(`/${path}/:id`, controller.get);
  router.post(`/${path}`, controller.create);
  router.put(`/${path}/:id`, controller.update);
  router.delete(`/${path}/:id`, controller.remove);
};

mountCrud('configurations', configurationController);
mountCrud('historiques-employe', historiqueEmployeController);
mountCrud('variables-mensuelles', variablesMensuelleController);
mountCrud('cumuls-annuels', cumulAnnuelController);
mountCrud('absences', absenceController);
mountCrud('gratifications', gratificationController);
mountCrud('indemnites-rupture', indemniteRuptureController);
mountCrud('declarations-cnps', declarationCnpsController);
mountCrud('declarations-fiscales', declarationFiscaleController);
mountCrud('disas', disaController);
mountCrud('dascs', dascController);
mountCrud('etat-301', etat301Controller);
mountCrud('ecritures-comptables', ecritureComptableController);
mountCrud('provisions-retraite', provisionRetraiteController);
mountCrud('provisions-conges', provisionCongeController);
mountCrud('livres-paie-mensuels', livrePaieMensuelController);
mountCrud('livres-paie-annuels', livrePaieAnnuelController);
mountCrud('ordres-bancaires', ordreBancaireController);
mountCrud('details-virement', detailVirementController);
mountCrud('statistiques-rh', statistiqueRhController);
mountCrud('ruptures-contrat', ruptureContratController);
mountCrud('certificats-travail', certificatTravailController);

module.exports = router;
