const express = require('express');
const router = express.Router();
const materielController = require('../controllers/materiel.controller');

router.get('/', materielController.getAll);
router.get('/alertes', materielController.getAlertes);
router.get('/sorties-en-cours', materielController.getSortiesEnCours);

module.exports = router;
