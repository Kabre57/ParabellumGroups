const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapport.controller');
const auth = require('../middleware/auth');

router.post('/', auth, rapportController.createRapport);
router.get('/', auth, rapportController.getAllRapports);
router.get('/:id', auth, rapportController.getRapportById);
router.put('/:id', auth, rapportController.updateRapport);
router.delete('/:id', auth, rapportController.deleteRapport);
router.post('/:id/execute', auth, rapportController.execute);
router.post('/:id/schedule', auth, rapportController.schedule);
router.get('/:id/executions/:executionId/download', auth, rapportController.download);
router.get('/:id/history', auth, rapportController.getHistory);

module.exports = router;
