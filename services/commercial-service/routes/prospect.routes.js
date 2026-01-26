const express = require('express');
const router = express.Router();
const prospectController = require('../controllers/prospect.controller');

router.get('/', prospectController.getAll);
router.get('/stats', prospectController.getStats);
router.get('/:id', prospectController.getById);
router.post('/', prospectController.create);
router.put('/:id', prospectController.update);
router.delete('/:id', prospectController.delete);
router.post('/:id/move', prospectController.moveStage);
router.post('/:id/convert', prospectController.convert);
router.get('/:id/activities', prospectController.getActivities);
router.post('/:id/activities', prospectController.addActivity);

module.exports = router;
