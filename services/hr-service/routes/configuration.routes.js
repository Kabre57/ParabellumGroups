const express = require('express');
const router = express.Router();
const configurationController = require('../controllers/configuration.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', configurationController.getActiveConfiguration);
router.get('/active', configurationController.getActiveConfiguration);
router.get('/history', configurationController.listConfigurations);
router.post('/', configurationController.upsertActiveConfiguration);
router.put('/', configurationController.upsertActiveConfiguration);
router.put('/active', configurationController.upsertActiveConfiguration);

module.exports = router;
