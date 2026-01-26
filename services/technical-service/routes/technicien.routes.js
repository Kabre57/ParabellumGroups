const express = require('express');
const router = express.Router();
const technicienController = require('../controllers/technicien.controller');

router.get('/', technicienController.getAll);
router.get('/available', technicienController.getAvailable);
router.get('/:id/stats', technicienController.getStats);
router.post('/', technicienController.create);
router.get('/:id', technicienController.getById);
router.put('/:id', technicienController.update);
router.patch('/:id/status', technicienController.updateStatus);

module.exports = router;
