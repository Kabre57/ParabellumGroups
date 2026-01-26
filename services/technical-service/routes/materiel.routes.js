const express = require('express');
const router = express.Router();
const materielController = require('../controllers/materiel.controller');

router.get('/', materielController.getAll);
router.get('/alertes', materielController.getAlertes);
router.get('/sorties-en-cours', materielController.getSortiesEnCours);
router.get('/:id', materielController.getById);              // NOUVEAU
router.post('/', materielController.create);                 // NOUVEAU
router.put('/:id', materielController.update);               // NOUVEAU
router.delete('/:id', materielController.delete);            // NOUVEAU
router.post('/sorties', materielController.createSortie);    // NOUVEAU
router.patch('/sorties/:id/retour', materielController.retourSortie); // NOUVEAU

module.exports = router;