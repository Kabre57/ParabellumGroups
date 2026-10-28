const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VALID_INTERVENTION_STATUSES,
  isLockedIntervention,
} = require('../services/interventionRules');

test('les statuts d’intervention exposés restent le référentiel métier autorisé', () => {
  assert.deepEqual(VALID_INTERVENTION_STATUSES, [
    'PLANIFIEE',
    'EN_COURS',
    'TERMINEE',
    'ANNULEE',
  ]);
  assert.equal(Object.isFrozen(VALID_INTERVENTION_STATUSES), true);
});

test('seules les interventions terminées sont verrouillées', () => {
  assert.equal(isLockedIntervention({ status: 'TERMINEE' }), true);
  assert.equal(isLockedIntervention({ status: 'EN_COURS' }), false);
  assert.equal(isLockedIntervention(null), false);
});
