// Point d’entrée des fonctions partagées par les contrôleurs de devis.
module.exports = {
  ...require('./core'),
  ...require('./workflow'),
  ...require('./persistence'),
};
