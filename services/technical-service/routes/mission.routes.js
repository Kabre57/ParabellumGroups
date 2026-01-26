const express = require('express');
const router = express.Router();
const missionController = require('../controllers/mission.controller');

router.get('/', missionController.getAll);
router.get('/stats', missionController.getStats);
router.post('/', missionController.create);
router.get('/:id', missionController.getById);
router.post('/:id/techniciens', missionController.assignTechnicien);
router.patch('/:id/status', missionController.updateStatus);

module.exports = router;
