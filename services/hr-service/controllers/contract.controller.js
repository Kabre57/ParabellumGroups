const { createCrudController } = require('../utils/crudFactory');

module.exports = createCrudController({
  model: 'contrat',
  idField: 'id',
  idType: 'int',
  filters: ['matricule', 'statutContrat', 'typeContrat'],
  include: { employe: true },
});
