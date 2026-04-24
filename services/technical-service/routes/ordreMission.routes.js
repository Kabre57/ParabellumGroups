const express = require('express');
const router = express.Router();
const ordreMissionController = require('../controllers/ordreMission.controller');

router.get('/', ordreMissionController.getAll);
router.post('/', ordreMissionController.create);
router.post('/batch', ordreMissionController.createBatch);
router.get('/:id/pdf', ordreMissionController.getPdf);
router.get('/:id', ordreMissionController.getById);
router.patch('/:id', ordreMissionController.update);
router.patch('/:id/printed', ordreMissionController.markPrinted);

module.exports = router;
