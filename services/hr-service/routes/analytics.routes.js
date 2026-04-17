const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/global-stats', analyticsController.getGlobalStats);
router.get('/indicators', analyticsController.getIndicators);

module.exports = router;
