const express = require('express');
const router = express.Router();
const missionController = require('../controllers/mission.controller');

router.get('/', missionController.getAll);
router.get('/stats', missionController.getStats);
router.post('/', missionController.create);
router.patch('/resync-crm/by-client/:clientId', missionController.resyncFromCrmByClient);
router.get('/:id/pdf', missionController.getPdf);
router.get('/:id', missionController.getById);
router.put('/:id', missionController.update);
router.patch('/:id/resync-crm', missionController.resyncFromCrm);
router.delete('/:id', missionController.delete);
router.post('/:id/techniciens', missionController.assignTechnicien);
router.patch('/:id/status', missionController.updateStatus);

module.exports = router;
