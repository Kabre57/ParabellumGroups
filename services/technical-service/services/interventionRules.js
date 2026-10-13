// Référentiel partagé par les contrôleurs pour éviter des règles de statut divergentes.
const VALID_INTERVENTION_STATUSES = Object.freeze([
  'PLANIFIEE',
  'EN_COURS',
  'TERMINEE',
  'ANNULEE',
]);

// Une intervention terminée reste verrouillée, sauf suppression forcée autorisée.
const isLockedIntervention = (intervention) => intervention?.status === 'TERMINEE';

module.exports = {
  VALID_INTERVENTION_STATUSES,
  isLockedIntervention,
};
