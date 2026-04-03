const { createCrudController } = require('../utils/crudFactory');

const build = (model, idField = 'id', idType = 'int') =>
  createCrudController({
    model,
    idField,
    idType,
  });

module.exports = {
  configurationController: build('configuration'),
  historiqueEmployeController: build('historiqueEmploye'),
  variablesMensuelleController: build('variablesMensuelle'),
  cumulAnnuelController: build('cumulAnnuel'),
  absenceController: build('absence'),
  gratificationController: build('gratification'),
  indemniteRuptureController: build('indemniteRupture'),
  declarationCnpsController: build('declarationCnps'),
  declarationFiscaleController: build('declarationFiscale'),
  disaController: build('disa'),
  dascController: build('dasc'),
  etat301Controller: build('etat301'),
  ecritureComptableController: build('ecritureComptable'),
  provisionRetraiteController: build('provisionRetraiteCalc'),
  provisionCongeController: build('provisionCongeCalc'),
  livrePaieMensuelController: build('livrePaieMensuel'),
  livrePaieAnnuelController: build('livrePaieAnnuel'),
  ordreBancaireController: build('ordreBancaire'),
  detailVirementController: build('detailVirement'),
  statistiqueRhController: build('statistiqueRh'),
  ruptureContratController: build('ruptureContrat'),
  certificatTravailController: build('certificatTravail'),
};
