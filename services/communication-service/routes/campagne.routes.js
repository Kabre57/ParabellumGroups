const express = require('express');
const router = express.Router();
const campagneController = require('../controllers/campagne.controller');
const auth = require('../middleware/auth');

router.post('/', auth, campagneController.create);
router.get('/', auth, campagneController.getAll);
router.get('/:id', auth, campagneController.getById);
router.put('/:id', auth, campagneController.update);
router.delete('/:id', auth, campagneController.delete);
router.post('/:id/schedule', auth, campagneController.schedule);
router.post('/:id/start', auth, campagneController.start);
router.get('/:id/stats', auth, campagneController.getStats);

module.exports = router;
