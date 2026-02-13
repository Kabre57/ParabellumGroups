const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/intervention.controller');

router.get('/', interventionController.getAll);
router.post('/', interventionController.create);
router.get('/:id', interventionController.getById);
router.put('/:id', interventionController.update);
router.delete('/:id', interventionController.delete);
router.patch('/:id/complete', interventionController.complete);

// Nouvelles routes pour ajouter technicien et matériel
router.post('/:id/techniciens', interventionController.addTechnicien);
router.post('/:id/materiel', interventionController.addMateriel);

module.exports = router;