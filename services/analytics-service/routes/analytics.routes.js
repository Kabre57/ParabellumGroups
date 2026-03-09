const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const auth = require('../middleware/auth');

router.get('/overview', auth, analyticsController.getOverview);
router.get('/sales', auth, analyticsController.getSalesStats);
router.get('/projects', auth, analyticsController.getProjectStats);
router.get('/hr', auth, analyticsController.getHRStats);
router.get('/finance', auth, analyticsController.getFinanceStats);

module.exports = router;
